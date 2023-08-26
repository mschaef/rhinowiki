(ns rhinowiki.site
  (:use compojure.core
        rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
            [hiccup.util :as hiccup-util]
            [rhinowiki.webserver :as webserver]
            [rhinowiki.parser :as parser]
            [rhinowiki.blog :as blog]
            [rhinowiki.feeds :as feeds]))


;;;; Web Site

(defn- url-query [ path params ]
  (str path (if (> (count params) 0)
              (str "?" (clojure.string/join "&" (map (fn [ [k v ] ] (str (name k) "=" v)) params)))
              "")))

(defn- blog-heading [ blog ]
  [:div.header
   [:a {:href "/"}
    [:h1
     (:blog-title blog)
     (when webserver/*dev-mode*
       [:span.tag.dev "DEV"])]]
   [:div.links
    (map (fn [ link ]
           [:a {:href (:link link) :target "_blank"}
            (or
             (when-let [ icon (:fa-icon link) ]
               [:i {:class (str "fa " icon)
                    :title (:label link)}])
             (:label link)
             "No icon or label specified.")])
         (or (:header-links blog) []))]])

(defn- site-page [ blog page-title body ]
  (hiccup/html
   [:html
    [:head
     [:meta {:name "viewport"
             :content "width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0"}]
     [:link {:rel "alternate" :type "application/atom+xml" :href (str (:base-url blog) "/feed/atom") :title "Atom Feed"}]
     [:link {:rel "alternate" :type "application/rss+xml" :href (str (:base-url blog) "/feed/rss") :title "RSS Feed"}]
     (page/include-css (webserver/resource-path "style.css")
                       (webserver/resource-path "font-awesome.min.css"))
     (page/include-js (webserver/resource-path "highlight.pack.js"))
     [:script "hljs.initHighlightingOnLoad();"]
     [:title
      (when webserver/*dev-mode* "DEV - ")
      (if page-title
        (str page-title " - " (:blog-title blog))
        (:blog-title blog))]]
    [:body
     (blog-heading blog)
     body
     [:div.footer
      (:copyright-message blog)
      [:span.item
       [:a {:href "/feed/atom"} "[atom]"]
       [:a {:href "/feed/rss"} "[rss]"]
       [:a {:href "/contents"} "[contents]"]]]]]))

(defn- article-sponsor [ blog article ]
  (get-in blog [ :sponsors (:sponsor article) ]))

(defn- article-sponsor-block [ blog article ]
  (when-let [ sponsor (article-sponsor blog article)]
    [:div.sponsor
     "Written with sponsorship by " [:a {:href (:link sponsor) :target "_blank"} (:long-name sponsor) "."]]))

(defn- article-tags [ blog article ]
  (when (> (count (:tags article)) 0)
    [:div.tags
     "Tags:"
     (map (fn [ tag ]
            [:span.tag
             [:a {:href (url-query "/" { :tag tag })} tag]])
          (sort (:tags article)))]))

(defn- article-block [ blog article ]
  [:div.article
   [:div.date
    (.format (:article-header (:date-format blog)) (:date article))]
   [:div.title
    [:a { :href (:permalink article)}
     (:title article)]]
   [:div.article-content
    (article-sponsor-block blog article)
    (parser/article-content-html article)
    (article-tags blog article)]])

(defn- article-page [ blog article-name ]
  (when-let [ article-info (blog/article-by-name blog article-name) ]
    (site-page blog
               (:title article-info)
               [:div (article-block blog article-info)])))

(defn- file-response [ blog file-name ]
  (when-let [ file-info (blog/file-by-name blog file-name) ]
    (java.io.ByteArrayInputStream. (:content-raw file-info))))

(defn- tag-query-block [ tag ]
  (when tag
    [:div.query
     "Articles with tag: "
     [:span.tag (hiccup-util/escape-html tag)]]))

(defn- articles-page [ blog start tag ]
  (let [display-articles (blog/blog-display-articles blog start tag (:recent-post-limit blog))]
    (site-page blog
               nil
               [:div.articles
                (tag-query-block tag)
                (map #(article-block blog %) display-articles)
                [:div.feed-navigation
                 (unless (< (count display-articles) (:recent-post-limit blog))
                         [:a {:href (url-query "/" (cond-> { :start (+ start (:recent-post-limit blog)) }
                                                     tag (assoc :tag tag)))}
                      "Older Articles..."])]])))

(defn- contents-block [ blog article ]
  [:div
   [:a
    {:href (:permalink article)}
    (:title article)]])

(defn- group-by-date-header [ blog articles ]
  (partition-by :date-header
                (map #(assoc % :date-header (.format (:contents-header (:date-format blog)) (:date %)))
                     articles)))

(defn- contents-page-article-entry [ blog article ]
  [:div.entry
   [:a { :href (:permalink article)}
    (:title article)]
   (when-let [ sponsor (article-sponsor blog article) ]
     [:span.sponsor
      "sponsor: " [:a {:href (:link sponsor) :target "_blank"} (:short-name sponsor)]])])

(defn- contents-page [ blog start tag ]
  (let [display-articles (blog/blog-display-articles blog start tag (:contents-post-limit blog))
        display-article-blocks (group-by-date-header blog display-articles)]
    (site-page blog
               "Table of Contents"
               [:div.contents
                (tag-query-block tag)
                [:div.subtitle "Table of Contents"]
                [:div.blocks
                 (map (fn [ block ]
                        [:div.block
                         [:div.header
                          (:date-header (first block))]
                         [:div.articles
                          (map #(contents-page-article-entry blog %) block)]])
                      display-article-blocks)]
                [:div.feed-navigation
                 (unless (< (count display-articles) (:contents-post-limit blog))
                         [:a {:href (url-query "/contents" (cond-> { :start (+ start (:contents-post-limit blog)) }
                                                             tag (assoc :tag tag)))}
                      "Older Articles..."])]])))


;;;; Blog Routing

(defn blog-routes [ blog ]
  (routes
   (GET "/" [ start tag ]
     (articles-page blog (or (parsable-integer? start) 0) tag))

   (GET "/contents" [ start tag ]
     (contents-page blog (or (parsable-integer? start) 0) tag))

   (feeds/feed-routes blog)

   (POST "/invalidate" []
      (blog/invalidate-cache blog)
      "invalidated")

   (GET "/*" { params :params }
     (article-page blog (:* params)))

   (GET "/*" { params :params }
     (file-response blog (:* params)))))

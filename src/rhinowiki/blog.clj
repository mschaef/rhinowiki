(ns rhinowiki.blog
  (:use compojure.core
        rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
            [ring.util.response :as ring-response]
            [rhinowiki.webserver :as webserver]
            [rhinowiki.parser :as parser]
            [rhinowiki.atom :as atom]
            [rhinowiki.rss :as rss]))


(defn blog-init [ blog ]
  (merge blog
         {:file-cache (atom nil)
          :blog-id (uuid/v5 (:blog-namespace blog) (map blog [:base-url :blog-author :blog-title]))}))

(defn- strip-ending [ file-name ending ]
  (and (.endsWith file-name ending)
       (.substring file-name 0 (- (.length file-name) (.length ending)))))

(defn- file-name-article-name [ file-name ]
  (or (strip-ending file-name "/index.md")
      (strip-ending file-name ".md")))

(defn- find-file-article [ data-file ]
  (if-let [ article-name (file-name-article-name (:file-name data-file))]
    (merge data-file {:article-name article-name
                      :content-text (String. (:content-raw data-file) "UTF-8")})
    data-file))

(defn article-permalink [ blog article ]
  (str (:base-url blog) "/" (:article-name article)))

(defn parse-article [ blog raw ]
  (-> raw
      (merge (parser/parse-article-file (:file-name raw) (:content-text raw)))
      (assoc :permalink (article-permalink blog raw))))

(defn process-data-files [ blog all-data-files ]
  (let [articles (map #(parse-article blog %) (filter :article-name (map find-file-article all-data-files)))]
    {:ordered (reverse (sort-by :date (filter :date articles)))
     :files-by-name (to-map :file-name all-data-files)
     :articles-by-name (to-map-with-keys
                        (fn [ article ]
                          (cons (:article-name article)
                                (:alias article)))
                        articles)}))

(defn data-files [ blog ]
  (if-let [files @(:file-cache blog)]
    files
    (swap! (:file-cache blog)
           (fn [ current-file-cache ]
             (process-data-files blog ((:load-fn blog)))))))

(defn invalidate-cache [ blog ]
  (log/info "Invalidating cache")
  (swap! (:file-cache blog) (fn [ current-file-cache ] nil)))

(defn file-by-name [ blog name ]
  (log/debug "Fetching file by name" name)
  (get-in (data-files blog) [ :files-by-name name ]))

(defn article-by-name [ blog name ]
  (log/debug "Fetching article by name" name)
  (get-in (data-files blog) [ :articles-by-name name ]))

(defn blog-articles [ blog ]
  (log/debug "Fetching recent articles")
  (:ordered (data-files blog)))

;;;; Web Site

(defn url-query [ path params ]
  (str path (if (> (count params) 0)
              (str "?" (clojure.string/join "&" (map (fn [ [k v ] ] (str (name k) "=" v)) params)))
              "")))

(defn blog-heading [ blog ]
  [:div.header
   [:a {:href "/"}
    [:h1 (:blog-title blog)]]
   [:div.links
    (map (fn [ link ]
           [:a {:href (:link link) :target "_blank"} (:label link)])
         (or (:header-links blog) []))]])

(defn site-page [ blog page-title body ]
  (hiccup/html
   [:html
    [:head
     [:meta {:name "viewport"
             :content "width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0"}]
     [:link {:rel "alternate" :type "application/atom+xml" :href (str (:base-url blog) "/feed/atom") :title "Atom Feed"}]
     [:link {:rel "alternate" :type "application/rss+xml" :href (str (:base-url blog) "/feed/rss") :title "RSS Feed"}]
     (page/include-css (webserver/resource-path "style.css"))
     (page/include-js (webserver/resource-path "highlight.pack.js"))
     [:script "hljs.initHighlightingOnLoad();"]
     [:title (if page-title
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

(defn article-sponsor [ blog article ]
  (get-in blog [ :sponsors (:sponsor article) ]))

(defn article-sponsor-block [ blog article ]
  (when-let [ sponsor (article-sponsor blog article)]
    [:div.sponsor
     "Written with sponsorship by " [:a {:href (:link sponsor) :target "_blank"} (:long-name sponsor) "."]]))

(defn article-tags [ blog article ]
  (when (> (count (:tags article)) 0)
    [:div.tags
     "Tags:"
     (map (fn [ tag ]
            [:span.tag
             [:a {:href (url-query "/" { :tag tag })} tag]])
          (sort (:tags article)))]))

(defn article-block [ blog article ]
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

(defn article-page [ blog article-name ]
  (when-let [ article-info (article-by-name blog article-name) ]
    (site-page blog
               (:title article-info)
               [:div (article-block blog article-info)])))

(defn file-response [ blog file-name ]
  (when-let [ file-info (file-by-name blog file-name) ]
    (java.io.ByteArrayInputStream. (:content-raw file-info))))

(defn- article-filter-start-at [ articles start ]
  (drop start articles))

(defn- article-filter-restrict-count [ articles limit ]
  (take limit articles))

(defn- article-filter-by-tag [ articles tag ]
  (filter #((:tags %) tag) articles))

(defn- article-remove-private [ articles ]
  (remove :private articles))

(defn blog-display-articles [ blog start tag limit ]
  (cond-> (blog-articles blog)
    (not (= tag "private")) (article-remove-private)
    tag (article-filter-by-tag tag)
    start (article-filter-start-at start)
    limit (article-filter-restrict-count limit)))

(defn tag-query-block [ tag ]
  (when tag
    [:div.query
     "Articles with tag: " [:span.tag tag]]))

(defn articles-page [ blog start tag ]
  (let [display-articles (blog-display-articles blog start tag (:recent-post-limit blog))]
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

(defn contents-block [ blog article ]
  [:div
   [:a
    {:href (:permalink article)}
    (:title article)]])

(defn group-by-date-header [ blog articles ]
  (partition-by :date-header
                (map #(assoc % :date-header (.format (:contents-header (:date-format blog)) (:date %)))
                     articles)))

(defn contents-page-article-entry [ blog article ]
  [:div.entry
   [:a { :href (:permalink article)}
    (:title article)]
   (when-let [ sponsor (article-sponsor blog article) ]
     [:span.sponsor
      "sponsor: " [:a {:href (:link sponsor) :target "_blank"} (:short-name sponsor)]])])

(defn contents-page [ blog start tag ]
  (let [display-articles (blog-display-articles blog start tag (:contents-post-limit blog))
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

(defn blog-feed-articles [ blog tag ]
  (blog-display-articles blog nil tag (:feed-post-limit blog)))

(defn blog-rss-response [ blog tag ]
  (println (str "RSS response" tag))
  (-> (rss/rss-blog-feed blog (blog-feed-articles blog tag))
      (ring-response/response)
      (ring-response/header "Content-Type" "text/xml")))

(defn blog-atom-response [ blog tag ]
  (-> (atom/atom-blog-feed blog (blog-feed-articles blog tag))
      (ring-response/response)
      (ring-response/header "Content-Type" "text/atom+xml")))

(defn blog-routes [ blog ]
  (routes
   (GET "/" [ start tag ]
     (articles-page blog (or (parsable-integer? start) 0) tag))

   (GET "/contents" [ start tag ]
     (contents-page blog (or (parsable-integer? start) 0) tag))

   (GET "/feed/atom" [ tag ]
     (blog-atom-response blog tag))

   (GET "/feed/rss" [ tag ]
     (blog-rss-response blog tag))

   (GET "/blog/index.rss" []
     (ring-response/redirect "/feed/rss" :moved-permanently))

   (GET "/blog/tech/index.rss" []
     (ring-response/redirect "/feed/rss?tag=tech" :moved-permanently))

   (GET "/blog/personal/index.rss" []
     (ring-response/redirect "/feed/rss?tag=personal" :moved-permanently))

   (POST "/invalidate" []
      (invalidate-cache blog)
      "invalidated")

   (GET "/*" { params :params }
     (article-page blog (:* params)))

   (GET "/*" { params :params }
     (file-response blog (:* params)))))

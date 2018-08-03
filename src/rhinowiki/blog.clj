(ns rhinowiki.blog
  (:use compojure.core
        rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]
            [markdown.core :as md]
            [markdown.transformers :as mdt]
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
    (swap! (:file-cache blog) (fn [ current-file-cache ]
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

(defn blog-heading [ blog ]
  [:div.header
   [:a {:href "/"}
    [:h1 (:blog-title blog)]]
   [:div.links
    (map (fn [ link ]
           [:a {:href (:link link)} (:label link)])
         (or (:header-links blog) []))]])

(defn site-page [ blog page-title body ]
  (hiccup/html
   [:html
    [:head
     [:link {:rel "alternate" :type "application/atom+xml" :link (str (:base-url blog) "/feed/atom") :title "Atom Feed"}]
     [:link {:rel "alternate" :type "application/rss+xml" :link (str (:base-url blog) "/feed/rss") :title "RSS Feed"}]
     (page/include-css (webserver/resource-path "style.css"))
     (page/include-js (webserver/resource-path "highlight.pack.js"))
     [:script "hljs.initHighlightingOnLoad();"]
     [:title page-title]]
    [:body
     (blog-heading blog)
     body
     [:div.footer
      (:copyright-message blog)
      [:span.item
       [:a {:href "/feed/atom"} "[atom]"]
       [:a {:href "/feed/rss"} "[rss]"]
       [:a {:href "/contents"} "[contents]"]]]]]))

(defn article-block [ blog article ]
  [:div.article
   [:div.date
    (.format (:article-header (:date-format blog)) (:date article))]
   [:div.title
    [:a { :href (:permalink article)}
     (:title article)]]
   [:div.article-content
    (:content-html article)]])

(defn article-page [ blog article-name ]
  (when-let [ article-info (article-by-name blog article-name) ]
    (site-page blog
               (:title article-info)
               [:div (article-block blog article-info)])))

(defn file-response [ blog file-name ]
  (when-let [ file-info (file-by-name blog file-name) ]
    (java.io.ByteArrayInputStream. (:content-raw file-info))))

(defn blog-display-articles [ blog start limit ]
  (take limit (drop (or start 0) (blog-articles blog))))

(defn articles-page [ blog start ]
  (let [ display-articles (blog-display-articles blog start (:recent-post-limit blog)) ]
    (site-page blog
               (:blog-title blog)
               [:div.articles
                (map #(article-block blog %) display-articles)
                [:div.feed-navigation
                 (unless (< (count display-articles) (:recent-post-limit blog))
                   [:a {:href (str "/?start=" (+ start (:recent-post-limit blog)))}
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

(defn contents-page [ blog start ]
  (let [display-articles (blog-display-articles blog start (:contents-post-limit blog))
        display-article-blocks (group-by-date-header blog display-articles)]
    (site-page blog
               (:blog-title blog)
               [:div.contents
                [:div.subtitle "Table of Contents"]
                [:div.blocks
                 (map (fn [ block ]
                        [:div.block
                         [:div.header
                          (:date-header (first block))]
                         [:div.articles
                          (map (fn [ article ]
                                 [:div.entry
                                  [:a { :href (:permalink article)} 
                                   (:title article)]])
                               block)]])
                      display-article-blocks)]
                [:div.feed-navigation
                 (unless (< (count display-articles) (:contents-post-limit blog))
                    [:a {:href (str "/contents?start=" (+ start (:contents-post-limit blog)))}
                      "Older Articles..."])]])))


;;;; Blog Routing

(defn blog-feed-articles [ blog ]
  (take (:feed-post-limit blog) (blog-articles blog)))

(defn blog-rss-response [ blog ]
  (-> (rss/rss-blog-feed blog (blog-feed-articles blog))
      (ring-response/response)
      (ring-response/header "Content-Type" "text/xml")))

(defn blog-routes [ blog ]
  (routes
   (GET "/" [ start ]
     (articles-page blog (or (parsable-integer? start) 0)))

   (GET "/contents" [ start ]
     (contents-page blog (or (parsable-integer? start) 0)))
   
   (GET "/feed/atom" []
     (-> (atom/atom-blog-feed blog (blog-feed-articles blog))
         (ring-response/response)
         (ring-response/header "Content-Type" "text/atom+xml")))

   (GET "/feed/rss" []
     (blog-rss-response blog))   

   (GET "/blog/index.rss" []
     (blog-rss-response blog))
   
   (GET "/blog/tech/index.rss" []
     (blog-rss-response blog))

   (GET "/blog/personal/index.rss" []
     (blog-rss-response blog))
              
   (POST "/invalidate" []
      (invalidate-cache blog)
      "invalidated")

   (GET "/*" { params :params }
     (article-page blog (:* params)))
   
   (GET "/*" { params :params }
     (file-response blog (:* params)))))


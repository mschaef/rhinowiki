(ns rhinowiki.blog
  (:use compojure.core)
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]
            [markdown.core :as markdown]
            [clojure.data.xml :as xml]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
            [ring.util.response :as ring-response]            
            [rhinowiki.webserver :as webserver]))

(def recent-post-limit 10)

(def blog-namespace #uuid "bf820223-4be5-495a-817e-c674271e43d2")

(def df-metadata (java.text.SimpleDateFormat. "yyyy-MM-dd"))
(def df-atom-rfc3339 (java.text.SimpleDateFormat. "yyyy-MM-dd'T'HH:mm:ssXXX"))

(defn blog-init [ blog ]
  (merge blog
         {:file-cache (atom nil)
          :blog-id (uuid/v5 blog-namespace (map blog [:base-url :blog-author :blog-title]))}))

(defn maybe-parse-date [ text ]
  (and text
       (try
         (.parse df-metadata text)
         (catch Exception ex
           nil))))

(defn- parse-data-file [ raw ]
  (let [parsed (markdown/md-to-html-string-with-meta (:content-raw raw))]
    (merge raw
           {:content-html (:html parsed)
            :title (first (get-in parsed [:metadata :title] [ (:name raw)]))
            :date (or (maybe-parse-date (first (get-in parsed [ :metadata :date ])))
                      (:file-date raw))})))

(defn process-data-files [ data-files ]
  (let [ ordered (reverse (sort-by :date (map parse-data-file data-files))) ]
    {:ordered ordered
     :by-name (into {} (map (fn [ file ]
                              [(:name file) file])
                            ordered ))}))

(defn data-files [ blog ]
  (if-let [files @(:file-cache blog)]
    files
    (swap! (:file-cache blog) (fn [ current-file-cache ]
                                (process-data-files ((:load-fn blog)))))))

(defn invalidate-cache [ blog ]
  (log/info "Invalidating cache")
  (swap! (:file-cache blog) (fn [ current-file-cache ] nil)))

(defn article-by-name [ blog name ]
  (log/info "Fetching article by name" name)
  (get-in (data-files blog) [ :by-name name ]))

(defn recent-articles [ blog ]
  (log/info "Fetching recent articles")
  (take recent-post-limit (:ordered (data-files blog))))

(defn article-permalink [ blog article ]
     (str (:base-url blog) "/" (:name article)))

;;;; Web Site
(def df-article-header (java.text.SimpleDateFormat. "MMMM d, y"))

(defn site-page [ blog page-title body ]
  (hiccup/html
   [:html
    [:head
     (page/include-css (webserver/resource-path "style.css"))
     (page/include-js (webserver/resource-path "highlight.pack.js"))
     [:script "hljs.initHighlightingOnLoad();"]
     [:title page-title]]
    [:body
     [:div.header
      [:a {:href "/"}
       [:h1 (:blog-title blog)]]]
     body
     [:div.footer
      (:copyright-message blog)]]]))

(defn article-block [ article ]
  [:div.article
   [:div.title
    (:title article)]
   [:div.date
    (.format df-article-header (:date article))]
   (:content-html article)])

(defn article-page [ blog article-name ]
  (when-let [ article-info (article-by-name blog article-name) ]
    (site-page blog (:title article-info) (article-block article-info))))

(defn articles-page [ blog articles ]
  (site-page blog
             (:blog-title blog)
             (map (fn [ article-info ]
                    [:div
                     (article-block article-info)
                     [:a { :href (article-permalink blog article-info)}
                      "Permalink"]])
                  articles)))

;;;; Atom Feed

(defn- atom-article-entry [ blog article ]
  (xml/element "entry" {}
               (xml/element "title" {} (:title article))
               (xml/element "id" {} (str "urn:uuid:" (:id article)))
               (xml/element "updated" {} (.format df-atom-rfc3339 (:date article)))
               (xml/element "author" {} (xml/element "name" {} (:blog-author blog)))
               (xml/element "link" {:href (article-permalink blog article)})               
               (xml/element "content" {:type "html"} (xml/cdata (:content-html article)))))

(defn atom-blog-feed [ blog articles ]
  (xml/indent-str
   (xml/element "feed" {:xmlns "http://www.w3.org/2005/Atom"}
                (xml/element "title" {} (:blog-title blog))
                (xml/element "link" {:href (:base-url blog)})
                (xml/element "link" {:rel "self" :href (str (:base-url blog) "/feed")} )
                (xml/element "updated" {} (.format df-atom-rfc3339 (:date (first articles))))
                (xml/element "id" {} (str "urn:uuid:" (:blog-id blog)))

                (map #(atom-article-entry blog %) articles))))

;;;; Blog Routing

(defn blog-routes [ blog ]
  (routes
   (GET "/" []
     (articles-page blog (recent-articles blog)))

   (GET "/feed" []
     (-> (atom-blog-feed blog (recent-articles blog))
         (ring-response/response)
         (ring-response/header "Content-Type" "text/atom+xml")))
  
   (GET "/:article-name" { params :params }
     (article-page blog (:article-name params)))
   
   (POST "/invalidate" []
     (invalidate-cache blog)
     "invalidated")))


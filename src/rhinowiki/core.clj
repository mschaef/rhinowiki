(ns rhinowiki.core
  (:gen-class)
  (:use compojure.core
        rhinowiki.utils
        rhinowiki.git
        [ring.middleware not-modified content-type browser-caching])  
  (:require [clojure.tools.logging :as log]
            [clojure.data.xml :as xml]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [ring.util.response :as ring-response]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
            [rhinowiki.data :as data]
            [rhinowiki.git :as git]
            [markdown.core :as markdown]))

;;(def base-url "http://www.mschaef.com")
(def blog {:base-url "http://localhost:8080"
           :blog-author "Mike Schaeffer"
           :blog-title "Mike Schaeffer's Weblog"
           :copyright-message "Copyright (C) 2017 - Mike Schaeffer"
           :blog-id #uuid "bf820223-4be5-495a-817e-c674271e43d2"})

(def recent-post-limit 10)
(def df-metadata (java.text.SimpleDateFormat. "yyyy-MM-dd"))
(def df-atom-rfc3339 (java.text.SimpleDateFormat. "yyyy-MM-dd'T'HH:mm:ssXXX"))
(def df-article-header (java.text.SimpleDateFormat. "MMMM d, y"))

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

(def file-cache (atom nil))

(defn data-files []
  (if-let [files @file-cache]
    files
    (swap! file-cache (fn [ current-file-cache ]
                        (map parse-data-file (git/load-data-files))))))

(defn invalidate-cache []
  (log/info "Invalidating cache")
  (swap! file-cache (fn [ current-file-cache ] nil)))

(defn article-by-name [ name ]
  (log/info "Fetching article by name" name)
  (first (filter #(= name (:name %)) (data-files))))

(defn all-articles []
  (log/info "Fetching all articles")
  (reverse (sort-by :date (data-files))))

(defn recent-articles []
  (log/info "Fetching recent articles")
  (take recent-post-limit (all-articles)))

;;;; HTML Renderer

(defn resource [ path ]
  (str "/" (get-version) "/" path))

(defn site-page [ blog page-title body ]
  (hiccup/html
   [:html
    [:head
     (page/include-css (resource "style.css"))
     (page/include-js (resource "highlight.pack.js"))
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
  (when-let [ article-info (article-by-name article-name) ]
    (site-page blog (:title article-info) (article-block article-info))))

(defn article-permalink [ blog article ]
     (str (:base-url blog) "/" (:name article)))

(defn articles-page [ blog articles ]
  (site-page blog
             (:blog-title blog)
             (map (fn [ article-info ]
                    [:div
                     (article-block article-info)
                     [:a { :href (article-permalink blog article-info)}
                      "Permalink"]])
                  articles)))


(defn atom-entry [ blog article ]
  (xml/element "entry" {}
               (xml/element "title" {} (:title article))
               (xml/element "id" {} (str "urn:uuid:" (:id article)))
               (xml/element "updated" {} (.format df-atom-rfc3339 (:date article)))
               (xml/element "author" {} (xml/element "name" {} (:blog-author blog)))
               (xml/element "link" {:href (article-permalink blog article)})               
               (xml/element "content" {:type "html"} (xml/cdata (:content-html article)))))

(defn atom-feed [ blog articles ]
  (xml/indent-str
   (xml/element "feed" {:xmlns "http://www.w3.org/2005/Atom"}
                (xml/element "title" {} (:blog-title blog))
                (xml/element "link" {:href (:base-url blog)})
                (xml/element "link" {:rel "self" :href (str (:base-url blog) "/feed")} )
                (xml/element "updated" {} (.format df-atom-rfc3339 (:date (first articles))))
                (xml/element "id" {} (str "urn:uuid:" (:blog-id blog)))

                (map #(atom-entry blog %) articles))))

(defn blog-routes [ blog ]
  (routes
   (GET "/" []
     (articles-page blog (recent-articles)))

   (GET "/feed" []
     (-> (atom-feed blog (recent-articles))
         (ring-response/response)
         (ring-response/header "Content-Type" "text/atom+xml")))
  
   (GET "/:article-name" { params :params }
     (article-page blog (:article-name params)))
   
   (route/resources (str "/" (get-version)))
   (route/resources "/")

   (POST "/invalidate" []
     (invalidate-cache)
     "invalidated") 
  
   (route/not-found "Resource Not Found")))

;;;; Handler Stack

(defn wrap-request-logging [ app ]
  (fn [req]
    (log/debug 'REQUEST (:request-method req) (:uri req))
    (let [resp (app req)]
      (log/trace 'RESPONSE (:status resp))
      resp)))

(defn wrap-show-response [ app label ]
  (fn [req]
    (let [resp (app req)]
      (log/trace label (dissoc resp :body))
      resp)))

(def handler (-> (blog-routes blog)
                 (wrap-content-type)
                 (wrap-browser-caching {"text/javascript" 360000
                                        "text/css" 360000})
                 (wrap-request-logging)
                 (handler/site)))
    
(defn start-webserver [ http-port ]
  (log/info "Starting Webserver on port" http-port)
  (let [server (jetty/run-jetty handler { :port http-port :join? false })]
    (add-shutdown-hook
     (fn []
       (log/info "Shutting down webserver")
       (.stop server)))
    (.join server)))

(defn -main   [& args]
  (log/info "Starting Rhinowiki" (get-version))
  (start-webserver (config-property "http.port" 8080))
  (log/info "end run."))



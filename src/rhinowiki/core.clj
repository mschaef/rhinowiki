(ns rhinowiki.core
  (:gen-class)
  (:use compojure.core
        rhinowiki.utils
        [ring.middleware not-modified content-type browser-caching])  
  (:require [clojure.tools.logging :as log]
            [compojure.route :as route]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
            [ring.util.response :as ring-response]            
            [rhinowiki.webserver :as webserver]
            [rhinowiki.blog :as blog]
            [rhinowiki.atom :as atom]
            [rhinowiki.data :as data]
            [rhinowiki.git :as git]))

;;(def base-url "http://www.mschaef.com")
(def blog {:base-url "http://localhost:8080"
           :blog-author "Mike Schaeffer"
           :blog-title "Mike Schaeffer's Weblog"
           :copyright-message "Copyright (C) 2017 - Mike Schaeffer"
           
           :load-fn #(git/load-data-files)})

(def df-article-header (java.text.SimpleDateFormat. "MMMM d, y"))

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
  (when-let [ article-info (blog/article-by-name blog article-name) ]
    (site-page blog (:title article-info) (article-block article-info))))

(defn articles-page [ blog articles ]
  (site-page blog
             (:blog-title blog)
             (map (fn [ article-info ]
                    [:div
                     (article-block article-info)
                     [:a { :href (blog/article-permalink blog article-info)}
                      "Permalink"]])
                  articles)))


(defn blog-routes [ blog ]
  (routes
   (GET "/" []
     (articles-page blog (blog/recent-articles blog)))

   (GET "/feed" []
     (-> (atom/blog-feed blog (blog/recent-articles blog))
         (ring-response/response)
         (ring-response/header "Content-Type" "text/atom+xml")))
  
   (GET "/:article-name" { params :params }
     (article-page blog (:article-name params)))
   
   (route/resources (str "/" (get-version)))
   (route/resources "/")

   (POST "/invalidate" []
     (blog/invalidate-cache blog)
     "invalidated") 
  
   (route/not-found "Resource Not Found")))

(defn -main   [& args]
  (log/info "Starting Rhinowiki" (get-version))
  (webserver/start (config-property "http.port" 8080)
                   (blog-routes (blog/blog-init blog)))
  (log/info "end run."))



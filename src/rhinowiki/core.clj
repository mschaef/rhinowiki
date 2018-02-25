(ns rhinowiki.core
  (:gen-class)
  (:use compojure.core
        rhinowiki.utils
        rhinowiki.git
        [ring.middleware not-modified content-type browser-caching])  
  (:require [clojure.tools.logging :as log]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [ring.util.response :as ring-response]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [hiccup.core :as hiccup]
            [hiccup.page :as page]
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

(def handler (-> (blog-routes (blog/blog-init blog))
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



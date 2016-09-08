(ns rhinowiki.core
  (:gen-class)
  (:use compojure.core
        rhinowiki.utils
        [ring.middleware not-modified content-type browser-caching])  
  (:require [clojure.tools.logging :as log]            
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [ring.util.response :as ring-response]
            [compojure.handler :as handler]
            [compojure.route :as route]
            [hiccup.core :as hiccup]
            [markdown.core :as markdown]
            [rhinowiki.data :as data]))


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

(defn content-page [ article-name content-markdown ]
  (let [parsed (markdown/md-to-html-string-with-meta content-markdown)
        title (first (get-in parsed [:metadata :title] [ article-name ]))]
    (hiccup/html
     [:html
      [:head
       [:title title]]
      [:body
       [:h1 title]
       [:div.article
        (:html parsed)]]])))

(defroutes all-routes
  ;; user/public-routes
  (GET "/:article-name" { { article-name :article-name } :params }
    (content-page article-name ((data/articles) article-name)))
  
  (route/resources  (str "/" (get-version)))
  (route/not-found "Resource Not Found"))

(def handler (-> all-routes
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

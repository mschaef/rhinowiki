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

(defn page [ title body ]
  (hiccup/html
   [:html
    [:head
     [:title title]]
    [:body
     [:h1 title]
     [:div.body
      body]]]))

(defn content-page [ article-name {content-markdown :content-markdown
                                   last-modified :last-modified} ]
  (let [parsed (markdown/md-to-html-string-with-meta content-markdown)
        title (first (get-in parsed [:metadata :title] [ article-name ]))]
    (page title [:div
                 [:div.last-modified
                  last-modified]
                 [:div.article
                  (:html parsed)]])))

(defn recent-articles-page []
  (page "Recent Articles"
        [:ul
         (map (fn [ article-info ]
                [:li [:a { :href (str "/" (:name article-info))} (:name article-info)]])
              (data/recent-articles))]))

(defroutes all-routes
  ;; user/public-routes
  (GET "/" []
    (recent-articles-page))
  
  (GET "/:article-name" { { article-name :article-name } :params }
    (content-page article-name ((data/articles-by-name) article-name)))
  
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

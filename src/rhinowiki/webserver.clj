(ns rhinowiki.webserver
  (:use compojure.core
        rhinowiki.utils
        [ring.middleware not-modified content-type browser-caching])
  (:require [clojure.tools.logging :as log]
            [compojure.route :as route]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [co.deps.ring-etag-middleware :as ring-etag]
            [compojure.handler :as handler]))

(defn resource-path [ path ]
  (str "/" (get-version) "/" path))

(defn- wrap-request-logging [ app ]
  (fn [req]
    (log/debug 'REQUEST (:request-method req) (:uri req))
    (let [resp (app req)]
      (log/trace 'RESPONSE (:status resp))
      resp)))

(defn- wrap-show-response [ app label ]
  (fn [req]
    (let [resp (app req)]
      (log/trace label (dissoc resp :body))
      resp)))

(defn wrap-invalidate-param [ app invalidate-fn ]
  (fn [req]
    (when (= (get-in req [:params :invalidate] req) "Y")
      (invalidate-fn))
    (app req)))

(defn- handler [ invalidate-fn app-routes ]
  (-> (routes
       app-routes
       (route/resources (str "/" (get-version)))
       (route/resources "/")
       (route/not-found "Resource Not Found"))
      (wrap-content-type)
      (wrap-browser-caching {"text/javascript" 360000
                             "text/css" 360000})
      (wrap-request-logging)
      (wrap-invalidate-param invalidate-fn)
      (handler/site)
      (ring-etag/wrap-file-etag)))

(defn start [ config invalidate-fn routes ]
  (let [{ http-port :http-port } config]
    (log/info "Starting Webserver on port" http-port)
    (let [server (jetty/run-jetty (handler invalidate-fn routes)
                                  { :port http-port :join? false })]
      (add-shutdown-hook
       (fn []
         (log/info "Shutting down webserver")
         (.stop server)))
      (.join server))))

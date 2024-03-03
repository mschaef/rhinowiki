(ns rhinowiki.webserver
  (:use compojure.core
        playbook.core
        rhinowiki.utils
        [ring.middleware not-modified content-type browser-caching])
  (:require [taoensso.timbre :as log]
            [compojure.route :as route]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.reload :as ring-reload]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [co.deps.ring-etag-middleware :as ring-etag]
            [compojure.handler :as handler]
            [playbook.config :as config]))

(defn resource-path [ path ]
  (str "/" (get-version) "/" path))

(defn wrap-invalidate-param [ app invalidate-fn ]
  (fn [req]
    (when (and (config/cval :development-mode)
               (= (get-in req [:params :invalidate] req) "Y"))
      (invalidate-fn))
    (app req)))

(defn- wrap-dev-support [ handler dev-mode ]
  (cond-> handler
    dev-mode (ring-reload/wrap-reload)))

(defn- handler [ invalidate-fn app-routes ]
  (-> (routes
       app-routes
       (route/resources (str "/" (get-version)))
       (route/resources "/")
       (route/not-found "Resource Not Found"))
      (wrap-content-type)
      (wrap-browser-caching {"text/javascript" 360000
                             "text/css" 360000})
      (wrap-invalidate-param invalidate-fn)
      (handler/site)
      (ring-etag/wrap-file-etag)
      (config/wrap-config)
      (wrap-dev-support (config/cval :development-mode))))

(defn start [ invalidate-fn routes ]
  (let [ http-port (config/cval :http-port) ]
    (log/info "Starting Webserver on port" http-port)
    (let [server (jetty/run-jetty (handler invalidate-fn routes)
                                  { :port http-port :join? false })]
      (add-shutdown-hook
       (fn []
         (log/info "Shutting down webserver")
         (.stop server)))
      (.join server))))

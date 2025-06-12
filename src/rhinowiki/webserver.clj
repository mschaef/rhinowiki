;; Copyright (c) 2015-2025 Michael Schaeffer (dba East Coast Toolworks)
;;
;; Licensed as below.
;;
;; Licensed under the Apache License, Version 2.0 (the "License");
;; you may not use this file except in compliance with the License.
;; You may obtain a copy of the License at
;;
;;       http://www.apache.org/licenses/LICENSE-2.0
;;
;; The license is also includes at the root of the project in the file
;; LICENSE.
;;
;; Unless required by applicable law or agreed to in writing, software
;; distributed under the License is distributed on an "AS IS" BASIS,
;; WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
;; See the License for the specific language governing permissions and
;; limitations under the License.
;;
;; You must not remove this notice, or any other, from this software.

(ns rhinowiki.webserver
  (:use compojure.core
        playbook.core
        [ring.middleware not-modified content-type browser-caching])
  (:require [taoensso.timbre :as log]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.reload :as ring-reload]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [co.deps.ring-etag-middleware :as ring-etag]
            [compojure.handler :as handler]
            [playbook.config :as config]))

(defn wrap-invalidate-param [ app invalidate-fn ]
  (fn [req]
    (when (and (config/cval :development-mode)
               (= (get-in req [:params :invalidate] req) "Y"))
      (invalidate-fn))
    (app req)))

(defn- wrap-dev-support [ handler dev-mode ]
  (cond-> handler
    dev-mode (ring-reload/wrap-reload)))

(defn- handler [ invalidate-fn routes ]
  (-> routes
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

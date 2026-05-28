;; Copyright (c) 2015-2026 Michael Schaeffer (dba East Coast Toolworks)
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

(ns rhinowiki.site.webserver
  (:use compojure.core
        playbook.core
        [ring.middleware not-modified content-type browser-caching])
  (:require [taoensso.timbre :as log]
            [ring.adapter.jetty :as jetty]
            [ring.middleware.reload :as ring-reload]
            [ring.middleware.file-info :as ring-file-info]
            [ring.middleware.resource :as ring-resource]
            [ring.util.response :as ring-response]
            [co.deps.ring-etag-middleware :as ring-etag]
            [compojure.handler :as handler]
            [playbook.config :as config]))

(defn wrap-virtual-host [handler sites-map]
  (fn [req]
    (let [host (-> (get-in req [:headers "host"] "")
                   (clojure.string/split #":")
                   first
                   clojure.string/trim)
          site (or (get sites-map host)
                   (get sites-map (config/cval :default-site)))]
      (if site
        (handler (assoc req
                        :rhinowiki/blog @(:blog-atom site)
                        :rhinowiki/invalidate-fn (:invalidate-fn site)))
        (do
          (log/warn "Misdirected request - no site configured for host:"
                    (pr-str host)
                    "uri:" (:uri req)
                    "remote-addr:" (:remote-addr req))
          {:status 421
           :headers {"Content-Type" "text/plain"}
           :body "Misdirected Request"}))))

(defn wrap-invalidate-param [app]
  (fn [req]
    (when (and (config/cval :development-mode)
               (try-parse-boolean
                (get-in req [:params :invalidate] req)
                false))
      (when-let [invalidate-fn (:rhinowiki/invalidate-fn req)]
        (invalidate-fn)))
    (app req)))

(defn- wrap-dev-support [handler dev-mode]
  (cond-> handler
    dev-mode (ring-reload/wrap-reload)))

(defn wrap-exception-handling [app]
  (fn [req]
    (try
      (app req)
      (catch Exception ex
        (let [ex-uuid (.toString (java.util.UUID/randomUUID))]
          (log/error ex (str "Unhandled exception while processing " (:request-method req)
                             " request to: " (:uri req) " (uuid: " ex-uuid ")"))
          (if (= (:uri req) "/error")
            (throw (Exception. "Double fault while processing uncaught exception." ex))
            (ring-response/redirect (str "/error?uuid=" ex-uuid))))))))

(defn- handler [sites-map routes]
  (-> routes
      (wrap-content-type)
      (wrap-browser-caching {"text/javascript" 360000
                             "text/css" 360000})
      (wrap-invalidate-param)
      (handler/site)
      (ring-etag/wrap-file-etag)
      (config/wrap-config)
      (wrap-virtual-host sites-map)
      (wrap-dev-support (config/cval :development-mode))
      (wrap-exception-handling)))

(defn start [sites-map routes]
  (let [http-port (config/cval :http-port)]
    (log/info "Starting Webserver on port" http-port)
    (let [server (jetty/run-jetty (handler sites-map routes)
                                  {:port http-port :join? false})]
      (add-shutdown-hook
       (fn []
         (log/info "Shutting down webserver")
         (.stop server)))
      (.join server))))

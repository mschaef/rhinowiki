(ns rhinowiki.core
  (:gen-class)
  (:use rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [cprop.core :as cprop]
            [rhinowiki.blog :as blog]
            [rhinowiki.git :as git]
            [rhinowiki.file :as file]
            [rhinowiki.webserver :as webserver]))

(defn parse-date-format [ df ]
  (java.text.SimpleDateFormat. df))

(defn resolve-load-fn [ config ]
  (let [{data-files :data-files} config]
    #(apply (case (:source data-files)
              :git git/load-data-files
              :file file/load-data-files
              (throw (RuntimeException. "Invalid data file source in config")))
            (apply concat data-files))))

(defn load-config []
  (let [config (-> (cprop/load-config :resource "config.edn")
                   (update :date-format #(vmap parse-date-format %)))]
    (assoc config :load-fn (resolve-load-fn config))))

(defn -main [& args]
  (log/info "Starting Rhinowiki" (get-version))
  (let [config (load-config)
        blog (blog/blog-init config)]
    (log/debug "config" config)
    (webserver/start (:http-port config)
                     #(blog/invalidate-cache blog)
                     (blog/blog-routes blog))
    (log/info "end run.")))



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
  (let [{data-files :data-files} config
        {source :source} data-files]
    (apply (case source
             :git git/data-file-loader
             :file file/data-file-loader
             (throw
              (RuntimeException.
               (str "Invalid data file source in config:" source))))
           (apply concat data-files))))

(defn load-config []
  (let [config (-> (cprop/load-config :resource "config.edn")
                   (update :date-format #(vmap parse-date-format %)))]
    (assoc config :load-fn (resolve-load-fn config))))

(defn -main [& args]
  (log/info "Starting Rhinowiki" (get-version))
  (let [config (load-config)]
    (log/debug "config" config)
    (webserver/start (:http-port config)
                     (blog/blog-routes (blog/blog-init config)))
    (log/info "end run.")))



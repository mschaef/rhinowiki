(ns rhinowiki.main
  (:gen-class :main true)
  (:use playbook.core)
  (:require [playbook.logging :as logging]
            [playbook.config :as config]
            [taoensso.timbre :as log]
            [rhinowiki.blog :as blog]
            [rhinowiki.git :as git]
            [rhinowiki.file :as file]
            [rhinowiki.webserver :as webserver]
            [rhinowiki.site :as site]))

(defn- parse-date-format [ df ]
  (java.text.SimpleDateFormat. df))

(defn resolve-load-fn [ config ]
  (let [{data-files :data-files} config]
    #(apply (case (:source data-files)
              :git git/load-data-files
              :file file/load-data-files
              (throw (RuntimeException. "Invalid data file source in config")))
            (apply concat data-files))))

(defn- load-config []
  (let [config (-> (config/load-config)
                   (update :date-format #(vmap parse-date-format %)))]
    (assoc config :load-fn (resolve-load-fn config))))

(defn- app-start [ config ]
    (let [ blog (blog/blog-init config)]
      (webserver/start config
                       (if (:development-mode config)
                         #(blog/invalidate-cache blog)
                         #())
                       (site/blog-routes blog))))

(defn -main [& args]
  (let [config (load-config)]
    (logging/setup-logging config)
    (log/info "Starting App" (:app config))
    (when (:development-mode config)
      (log/warn "=== DEVELOPMENT MODE ==="))
    (app-start config)
    (log/info "end run.")))

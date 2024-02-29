(ns rhinowiki.main
  (:gen-class :main true)
  (:use playbook.core
        playbook.main)
  (:require [playbook.config :as config]
            [taoensso.timbre :as log]
            [rhinowiki.blog :as blog]
            [rhinowiki.webserver :as webserver]
            [rhinowiki.site :as site]
            [rhinowiki.git :as git]
            [rhinowiki.file :as file]))

(defn- parse-date-format [ df ]
  (java.text.SimpleDateFormat. df))

(defn resolve-load-fn [ ]
  (let [ config (config/cval)]
    (let [{data-files :data-files} config]
      #(apply (case (:source data-files)
                :git git/load-data-files
                :file file/load-data-files
                (throw (RuntimeException. "Invalid data file source in config")))
              (apply concat data-files)))))

(defn- app-start [ config ]
    (let [ blog (blog/blog-init config)]
      (webserver/start config
                       (if (config/cval :development-mode)
                         #(blog/invalidate-cache blog)
                         #())
                       (site/blog-routes blog))))

(defmain [ & args ]
  (config/with-extended-config  {:load-fn (resolve-load-fn)
                                 :date-format (vmap parse-date-format (config/cval :date-format))}
    (app-start (config/cval))))

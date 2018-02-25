(ns rhinowiki.core
  (:gen-class)
  (:use rhinowiki.utils)  
  (:require [clojure.tools.logging :as log]
            [rhinowiki.blog :as blog]
            [rhinowiki.git :as git]
            [rhinowiki.webserver :as webserver]))

;;(def base-url "http://www.mschaef.com")
(def blog {:base-url "http://localhost:8080"
           :blog-author "Mike Schaeffer"
           :blog-title "Mike Schaeffer's Weblog"
           :copyright-message "Copyright (C) 2017 - Mike Schaeffer"
           
           :load-fn #(git/load-data-files)})

(defn -main   [& args]
  (log/info "Starting Rhinowiki" (get-version))
  (webserver/start (config-property "http.port" 8080)
                   (blog/blog-routes (blog/blog-init blog)))
  (log/info "end run."))



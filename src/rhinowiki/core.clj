(ns rhinowiki.core
  (:gen-class)
  (:use rhinowiki.utils)  
  (:require [clojure.tools.logging :as log]
            [rhinowiki.blog :as blog]
            [rhinowiki.git :as git]
            [rhinowiki.file :as file]
            [rhinowiki.webserver :as webserver]))

(def blog {:blog-namespace #uuid "bf820223-4be5-495a-817e-c674271e43d2"
           :recent-post-limit 10
           :feed-post-limit 20
           :contents-post-limit 100           
           
           :df-articles-header (java.text.SimpleDateFormat. "MMMM dd, yyyy")
           :df-contents-header (java.text.SimpleDateFormat. "MMMM yyyy")
           :df-article-header (java.text.SimpleDateFormat. "MMMM d, y")
           
           :base-url "http://localhost:8080"
           :blog-author "Mike Schaeffer"
           :blog-title "Mike Schaeffer's Weblog"
           :copyright-message "Copyright (C) 2018 - Mike Schaeffer"
           
           ;:load-fn #(git/load-data-files :data-root "data/")
           :load-fn #(file/load-data-files :article-root "data/")})

(defn -main   [& args]
  (log/info "Starting Rhinowiki" (get-version))
  (webserver/start (config-property "http.port" 8080)
                   (blog/blog-routes (blog/blog-init blog)))
  (log/info "end run."))



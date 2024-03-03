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

(def handlers {:git git/load-data-files
               :file file/load-data-files})

(defmain [ & args ]
  (let [ blog (blog/blog-init handlers) ]
    (webserver/start
     #(blog/invalidate-cache blog)
     (site/blog-routes blog))))

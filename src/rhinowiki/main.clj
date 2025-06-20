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

(ns rhinowiki.main
  (:gen-class :main true)
  (:use playbook.core
        playbook.main
        rhinowiki.utils)
  (:require [playbook.config :as config]
            [taoensso.timbre :as log]
            [rhinowiki.blog :as blog]
            [rhinowiki.webserver :as webserver]
            [rhinowiki.site :as site]
            [rhinowiki.git :as git]
            [rhinowiki.file :as file]
            [rhinowiki.routes :as routes]))

(def handlers {:git git/load-data-files
               :file file/load-data-files})

(defmain [& args]
  (let [blog (blog/blog-init handlers)]
    (webserver/start
     #(blog/invalidate-cache blog)
     (routes/all-routes blog))))

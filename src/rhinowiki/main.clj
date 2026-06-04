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

(ns rhinowiki.main
  (:gen-class :main true)
  (:use playbook.core
        playbook.main
        rhinowiki.utils)
  (:require [playbook.config :as config]
            [rhinowiki.blog.blog :as blog]
            [rhinowiki.blog.ext-links :as ext-links]
            [rhinowiki.store.watcher :as watcher]
            [rhinowiki.site.webserver :as webserver]
            [rhinowiki.site.routes :as routes]))

(defmain [& args]
  (let [sites-map
        (into {}
              (map (fn [[hostname store-spec]]
                     (let [generation (atom 0)
                           load-blog #(blog/blog-init store-spec)
                           blog-atom (atom (load-blog))
                           rebuild-ext-links! #(future
                                                 (ext-links/rebuild-registry!
                                                  (map :content-text (blog/blog-all-articles %))))
                           invalidate-fn #(let [new-blog (load-blog)]
                                            (reset! blog-atom new-blog)
                                            (swap! generation inc)
                                            (rebuild-ext-links! new-blog))]
                       (rebuild-ext-links! @blog-atom)
                       (when (and (config/cval :development-mode)
                                  (= :file (:source store-spec)))
                         (watcher/start-watcher (:article-root store-spec) invalidate-fn))
                       [hostname {:blog-atom blog-atom
                                  :invalidate-fn invalidate-fn
                                  :generation generation}]))
                   (config/cval :sites)))]
    (webserver/start sites-map (routes/all-routes))))

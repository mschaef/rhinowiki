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

(ns rhinowiki.blog
  (:use compojure.core
        playbook.core)
  (:require [taoensso.timbre :as log]
            [clj-uuid :as uuid]
            [playbook.config :as config]
            [rhinowiki.store.git :as git]
            [rhinowiki.store.file :as file]
            [rhinowiki.parser :as parser]))

(defn- parse-date-format [ df ]
  (java.text.SimpleDateFormat. df))

(def handlers {:git git/load-data-files
               :file file/load-data-files})

(defn- resolve-load-fn []
  (let [ data-files (config/cval :data-files)]
    (if-let [ handler ((:source data-files) handlers) ]
      #(apply handler (apply concat data-files))
      (throw (RuntimeException. "Invalid data file source in config")))))

(defn blog-init []
  ;; Include configuration information in the blog map. A chunk of the
  ;; existing blog code relies on it being there.
  (merge (config/cval)
         {:load-fn (resolve-load-fn)
          :date-format (vmap parse-date-format (config/cval :date-format))
          :file-cache (atom nil)
          :blog-id (uuid/v5 (config/cval :blog-namespace)
                            (map config/cval [:blog-base-url :blog-author :blog-title]))}))

(defn- strip-ending [ file-name ending ]
  (and (.endsWith file-name ending)
       (.substring file-name 0 (- (.length file-name) (.length ending)))))

(defn- file-name-article-name [ file-name ]
  (or (strip-ending file-name "/index.md")
      (strip-ending file-name ".md")))

(defn- find-file-article [ data-file ]
  (if-let [ article-name (file-name-article-name (:file-name data-file))]
    (merge data-file {:article-name article-name
                      :content-text (String. (:content-raw data-file) "UTF-8")})
    data-file))

(defn- article-permalink [ blog article ]
  (str (:blog-base-url blog) "/" (:article-name article)))

(defn- parse-article [ blog raw ]
  (-> raw
      (merge (parser/parse-article-file (:file-name raw) (:content-text raw)))
      (assoc :permalink (article-permalink blog raw))))

(defn- process-data-files [ blog all-data-files ]
  (let [articles (map #(parse-article blog %) (filter :article-name (map find-file-article all-data-files)))]
    {:ordered (reverse (sort-by :date (filter :date articles)))
     :files-by-name (to-map :file-name all-data-files)
     :articles-by-name (to-map-with-keys
                        (fn [ article ]
                          (cons (:article-name article)
                                (:alias article)))
                        articles)}))

(defn- data-files [ blog ]
  (if-let [files @(:file-cache blog)]
    files
    (swap! (:file-cache blog)
           (fn [ current-file-cache ]
             (process-data-files blog ((:load-fn blog)))))))

(defn invalidate-cache [ blog ]
  (log/info "Invalidating cache")
  (swap! (blog :file-cache) (constantly nil)))

(defn file-by-name [ blog name ]
  (log/debug "Fetching file by name" name)
  (get-in (data-files blog) [ :files-by-name name ]))

(defn article-by-name [ blog name ]
  (log/debug "Fetching article by name" name)
  (get-in (data-files blog) [ :articles-by-name name ]))

(defn blog-articles [ blog ]
  (log/debug "Fetching recent articles")
  (:ordered (data-files blog)))

(defn- article-filter-start-at [ articles start ]
  (drop start articles))

(defn- article-filter-restrict-count [ articles limit ]
  (take limit articles))

(defn- article-filter-by-tag [ articles tag ]
  (filter #((:tags %) tag) articles))

(defn- article-remove-private [ articles ]
  (remove :private articles))

(defn blog-display-articles [ blog start tag limit ]
  (cond-> (blog-articles blog)
    (not (= tag "private")) (article-remove-private)
    tag (article-filter-by-tag tag)
    start (article-filter-start-at start)
    limit (article-filter-restrict-count limit)))

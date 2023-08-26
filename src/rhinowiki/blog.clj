(ns rhinowiki.blog
  (:use compojure.core
        rhinowiki.utils)
  (:require [clojure.tools.logging :as log]
            [clj-uuid :as uuid]
            [rhinowiki.parser :as parser]))

(defn blog-init [ blog ]
  (merge blog
         {:file-cache (atom nil)
          :blog-id (uuid/v5 (:blog-namespace blog)
                            (map blog [:base-url :blog-author :blog-title]))}))

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
  (str (:base-url blog) "/" (:article-name article)))

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
  (swap! (:file-cache blog) (fn [ current-file-cache ] nil)))

(defn file-by-name [ blog name ]
  (log/debug "Fetching file by name" name)
  (get-in (data-files blog) [ :files-by-name name ]))

(defn article-by-name [ blog name ]
  (log/debug "Fetching article by name" name)
  (get-in (data-files blog) [ :articles-by-name name ]))

(defn blog-articles [ blog ]
  (log/debug "Fetching recent articles")
  (:ordered (data-files blog)))


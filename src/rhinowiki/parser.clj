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

(ns rhinowiki.parser
  (:use playbook.core)
  (:require [taoensso.timbre :as log]
            [markdown.core :as md]
            [markdown.transformers :as mdt]
            [rhinowiki.highlight :as highlight]))

(def df-metadata (java.text.SimpleDateFormat. "yyyy-MM-dd"))

(defn maybe-parse-metadata-date [text]
  (and text
       (try
         (.parse df-metadata text)
         (catch Exception ex
           nil))))

(defn- make-server-image-link [base src alt]
  (format "![%s](%s)" alt (.getAbsolutePath (java.io.File. (format "/%s/%s" base src)))))

(defn- image-link-rewriter [root-file-name]
  (let [base (or (.getParent (java.io.File. root-file-name)) "")]
    (fn [text state]
      (loop [matches (distinct (re-seq #"!\[([^\]]+)\]\s*\(([^\)]+)\)" text))
             new-text text]
        (if (seq matches)
          (let [[m alt src] (first matches)]
            (recur (rest matches)
                   (clojure.string/replace new-text m (make-server-image-link base src alt))))
          [new-text state])))))

(defn article-md-to-html [file-name article-text]
  (md/md-to-html-string-with-meta article-text
                                  :footnotes? true
                                  :reference-links? true
                                  :replacement-transformers (cons (image-link-rewriter file-name)
                                                                  mdt/transformer-vector)
                                  :codeblock-no-escape? true
                                  :codeblock-callback (fn
                                                        [code language]
                                                        (highlight/highlight file-name code language))))

(def more-tag "<!--more-->")

(defn string-index-of [string text]
  (let [index (.indexOf string text)]
    (and (>= index 0)
         index)))

(defn parse-article-md [file-name article-text]
  (if-let [tag-index (string-index-of article-text more-tag)]
    (let [short-text (.substring article-text 0 tag-index)]
      {:short-text
       (delay (article-md-to-html file-name short-text))
       :full-text
       (delay (article-md-to-html file-name (str short-text (.substring article-text (+ tag-index (.length more-tag))))))})
    {:full-text (delay (article-md-to-html file-name article-text))}))

(defn parse-article-file [file-name article-md]
  (log/debug "parse-article-file" file-name)
  (let [metadata (md/md-to-meta article-md)
        tags (set (remove empty? (clojure.string/split (first (:tags metadata [""])) #"\s+")))]
    (-> {:file-name file-name
         :content-html (parse-article-md file-name article-md)
         :title (first (:title metadata [(:article-name article-md)]))
         :date (or (maybe-parse-metadata-date (first (:date metadata)))
                   (:file-date article-md))
         :sponsor (first (:sponsor metadata [nil]))
         :tags tags
         :alias (:alias metadata [])
         :private (or (tags "private")
                      (try-parse-boolean (first (or (:private metadata)
                                                    ["false"]))))})))

(defn article-short-html [article]
  (log/debug "article-short-html" (:file-name article))
  (if-let [short-text (:short-text (:content-html article))]
    (:html @short-text)))

(defn article-content-html [article]
  (log/debug "article-content-html" (:file-name article))
  (:html @(:full-text (:content-html article))))

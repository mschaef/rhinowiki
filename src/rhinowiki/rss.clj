(ns rhinowiki.rss
  (:use rhinowiki.utils)
  (:require [clojure.data.xml :as xml]))

(def df-rss-rfc822 (java.text.SimpleDateFormat. "EEE, dd MMM yyyy HH:mm:ss Z"))

(defn rss-blog-email [ blog ]
  (format "%s (%s)" (:blog-email blog) (:blog-author blog)))

(defn rss-article-entry [ blog article ]
  (xml/element "item" {}
               (xml/element "title" {} (:title article))
               (xml/element "link" {} (:permalink article))
               (xml/element "author" {} (rss-blog-email blog))
               (xml/element "guid" {} (:permalink article))
               (xml/element "pubDate" {}  (.format df-rss-rfc822 (:date article)))
               (xml/element "description" {} (xml/cdata (:content-html article)))))

(defn rss-blog-feed [ blog articles ]
  (xml/indent-str
   (xml/element "rss" {:version "2.0"}
                (xml/element "channel" {}
                             (xml/element "title" {} (:blog-title blog))
                             (xml/element "link" {} (:base-url blog))
                             (xml/element "description" {} (:blog-title blog))
                             (xml/element "managingEditor" {} (rss-blog-email blog))
                             (xml/element "webMaster" {} (rss-blog-email blog))
                             (xml/element "generator" {} (str "rhinowiki-" (get-version)))
                             (xml/element "language" {} (:blog-language blog))
                             (xml/element "docs" {} "http://blogs.law.harvard.edu/tech/rss")
                             (xml/element "pubDate" {} (.format df-rss-rfc822 (or (:date (first articles))
                                                                                    (java.util.Date.))))                             
                             (map #(rss-article-entry blog %) articles)))))
 

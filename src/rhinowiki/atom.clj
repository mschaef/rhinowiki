(ns rhinowiki.atom
  (:use rhinowiki.utils)
  (:require [clojure.data.xml :as xml]
            [rhinowiki.parser :as parser]))

(def df-atom-rfc3339 (java.text.SimpleDateFormat. "yyyy-MM-dd'T'HH:mm:ssXXX"))

(defn- atom-article-entry [ blog article ]
  (xml/element "entry" {}
               (xml/element "title" {} (:title article))
               (xml/element "id" {} (str "urn:uuid:" (:id article)))
               (xml/element "updated" {} (.format df-atom-rfc3339 (:date article)))
               (xml/element "author" {} (xml/element "name" {} (:blog-author blog)))
               (xml/element "link" {:href (:permalink article)})               
               (xml/element "content" {:type "html"}
                            (xml/cdata (parser/article-content-html article)))))

(defn atom-blog-feed [ blog articles ]
  (xml/indent-str
   (xml/element "feed" {:xmlns "http://www.w3.org/2005/Atom"}
                (xml/element "title" {} (:blog-title blog))
                (xml/element "link" {:href (:base-url blog)})
                (xml/element "link" {:rel "self" :href (str (:base-url blog) "/feed/atom")} )
                (xml/element "updated" {} (.format df-atom-rfc3339 (or (:date (first articles))
                                                                       (java.util.Date.))))
                (xml/element "id" {} (str "urn:uuid:" (:blog-id blog)))
                (map #(atom-article-entry blog %) articles))))

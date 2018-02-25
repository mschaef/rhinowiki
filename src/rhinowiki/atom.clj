(ns rhinowiki.atom
  (:require [clojure.data.xml :as xml]
            [rhinowiki.blog :as blog]))

(def df-atom-rfc3339 (java.text.SimpleDateFormat. "yyyy-MM-dd'T'HH:mm:ssXXX"))

(defn- article-entry [ blog article ]
  (xml/element "entry" {}
               (xml/element "title" {} (:title article))
               (xml/element "id" {} (str "urn:uuid:" (:id article)))
               (xml/element "updated" {} (.format df-atom-rfc3339 (:date article)))
               (xml/element "author" {} (xml/element "name" {} (:blog-author blog)))
               (xml/element "link" {:href (blog/article-permalink blog article)})               
               (xml/element "content" {:type "html"} (xml/cdata (:content-html article)))))

(defn blog-feed [ blog articles ]
  (xml/indent-str
   (xml/element "feed" {:xmlns "http://www.w3.org/2005/Atom"}
                (xml/element "title" {} (:blog-title blog))
                (xml/element "link" {:href (:base-url blog)})
                (xml/element "link" {:rel "self" :href (str (:base-url blog) "/feed")} )
                (xml/element "updated" {} (.format df-atom-rfc3339 (:date (first articles))))
                (xml/element "id" {} (str "urn:uuid:" (:blog-id blog)))

                (map #(article-entry blog %) articles))))


(ns rhinowiki.data
     (:use rhinowiki.utils))

(defn- data-files []
  (filter #(.isFile %)
          (file-seq (java.io.File. "data/"))))

(defn articles []
  (into {}
        (map (fn [ data-file ]
               [(.getName data-file) (slurp data-file)])
             (data-files))))

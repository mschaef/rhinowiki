(ns rhinowiki.git
  (:use rhinowiki.utils))

(defn tree-walk-seq [ tree-walk ]
  (if-let [next (.next tree-walk)]
    (let [path-string (.getPathString tree-walk)]
      (cons {:path-string path-string
             :name (.getName (java.io.File. path-string))
             :object-id (.getObjectId tree-walk 0)}
            (lazy-seq (tree-walk-seq tree-walk))))
    ()))

(defn git-object-string [ repo object-id ]
  (let [loader (.open repo object-id)]
    (String. (.getBytes loader) "UTF-8")))

(defn recursive-tree-walk [ repo tree ]
  (let [tree-walk (org.eclipse.jgit.treewalk.TreeWalk. repo)]
    (.addTree tree-walk tree)
    (.setRecursive tree-walk true)
    tree-walk))

(defn git-items [ repo ref-name ]
  (let [head (.getRef repo ref-name)]
    (with-open [walk (org.eclipse.jgit.revwalk.RevWalk. repo)]
      (let [commit (.parseCommit walk (.getObjectId head))
            tree (.parseTree walk (.getId (.getTree commit)))]
        (with-open [tree-walk (recursive-tree-walk repo tree)]
          (doall (tree-walk-seq tree-walk)))))))

(defn git-markdowns [ repo ref-name article-root ]
  (map #(merge % {:content-raw (git-object-string repo (:object-id %))})
       (filter #(and
                 (.startsWith (:path-string %) article-root)
                 (.endsWith (:path-string %) ".md"))
               (git-items repo ref-name)))  )

(defn git-file-repo [ root ]
  (.build (.setWorkTree (org.eclipse.jgit.storage.file.FileRepositoryBuilder.) (java.io.File. root))))

(defn load-data-files []
  (doall (git-markdowns (git-file-repo ".") "refs/heads/master" "data/")))

(defn dump-git-markdowns []
  (doseq [item (load-data-files)]
    (println ">>> " (:path-string item) (:name item))
    ;;(println item)
    ))

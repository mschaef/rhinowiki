(ns rhinowiki.git
  (:use rhinowiki.utils))

(defn tree-walk-seq [ tree-walk ]
  (if-let [next (.next tree-walk)]
    (cons {:path-string (.getPathString tree-walk)
           :object-id (.getObjectId tree-walk 0)}
          (lazy-seq (tree-walk-seq tree-walk)))
    ()))

(defn git-object-string [ repo object-id ]
  (let [loader (.open repo object-id)]
    (String. (.getBytes loader) "UTF-8")))

(defn recursive-tree-walk [ repo tree ]
  (let [tree-walk (org.eclipse.jgit.treewalk.TreeWalk. repo)]
    (.addTree tree-walk tree)
    (.setRecursive tree-walk true)
    tree-walk))

(defn dump-git-markdowns []
  (let [repo (.build (.setWorkTree (org.eclipse.jgit.storage.file.FileRepositoryBuilder.) (java.io.File. ".")))
        head (.getRef repo "refs/heads/master")]
    (with-open [walk (org.eclipse.jgit.revwalk.RevWalk. repo)]
      (let [commit (.parseCommit walk (.getObjectId head))
            tree (.parseTree walk (.getId (.getTree commit)))]
        (with-open [tree-walk (recursive-tree-walk repo tree)]
          (doseq [item (filter #(.endsWith (:path-string %) ".md") (tree-walk-seq tree-walk))]
            (println ">>> " (:path-string item))
            (println (git-object-string repo (:object-id item)))))))))

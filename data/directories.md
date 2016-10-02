title:Working with Directories
date: 2016-09-30

This is a bash function definition that takes you to the top level
directory of a git project.

```bash
function cdtop() {
    local git_root;

    git_root=`git rev-parse --show-toplevel`;

    if [ $? -eq 0 ]
    then
        cd ${git_root}
    else
        return 1
    fi
}
```

Here's a git alias that does serves a similar purpose. What this does
is define a new alias, `exec`, that executes a shell command in the
current project's root.


```bash
git config --global alias.exec '!exec '
```

With this alias defined, you can say the following  and it
will take you to the project root.

```bash
cd `git exec pwd`
```

<http://stackoverflow.com/questions/957928/is-there-a-way-to-get-the-git-root-directory-in-one-command>

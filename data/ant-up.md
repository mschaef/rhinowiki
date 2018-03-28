title: Ant-up
date: 2008-01-09
filename: ./tech/programming/ant-up.txt

In my career, I've done a bit of switching back and forth between <a
href="http://www.gnu.org/software/emacs/">Emacs</a> and various
IDE's. One of the IDE features I've come to depend on is quick access
to the compiler. Typically, IDE's make it possible to compile your
project with a keystroke, and then navigate from error to error at the
press of a key. It's easy to recreate this in Emacs. The following two
expressions make Emacs work a lot like Visual Studio in this regard.

```lisp
(global-set-key [(shift f5)] 'compile)
(global-set-key [f12] 'next-error)
```

After these forms are evaluated, pressing Shift-F5 invokes the
`compile` command, which asks for a command to be run in an
inferior shell, typically `make`, `ant`, or some other
build utility. The catch is that it runs the command in the directory
of the current buffer, which implies that the build script can be
found in the same directory as the current source file. For a Java
project with a per-package directory hierarchy, this is often not
true. There are probably a bunch of ways to fix this, but I've solved
it with a Windows NT batch file, `ant-up.bat`, that repeatedly
searches up the directory hierarchy for `build.xml`. I just
compile with `ant-up`, rather than a direct invocation of
`ant`. This is not the most elegant solution, I'm sure, but it
took about five minutes to implement and works well.

```
@echo off

setlocal

:retry

set last_path=%CD%

echo Searching %CD% ...

if exist build.xml goto compile-now

cd ..

if "%last_path%"=="%CD%" goto abort

goto retry

:compile-now

call ant -k %1 %2 %3 %4 %5

if errorlevel 1 goto failure

goto success

:abort

echo build.xml not found... compile failed

:failure

exit /b 1

:success

exit /b 0
```

title: Visual Studio 2003 Safety Tip: Your Projects have GUIDs
date: 2006-03-20
filename: ./tech/general/vs2003_guids.txt

If you ever manually work with Visual Studio 2003
projects (`*.vcproj` files), be aware that projects have both
names and GUIDs, which are usually assigned by the IDE. If you
try to duplicate a project in a solution by copying it to a new
directory, renaming  it, and adding the copy to your solution, the MSVC IDE
will get confused since you didn't give your new project a new GUID. 
Other things might be effected by this confusion too, but the inter-project
dependancy editor definately can't distinguish between the two same-GUID
projects. This ends up making it impossible to correctly sequence the
two project builds, and there's no clue in the UI about the cause of the
problem, since the dependancy editor lists the two same-GUID projects
under seperate names.

I don't know if MSBuild, in VS2005, is any better, but they claim to
have made it more friendly to non-IDE use cases. The strange thing about
this is that I'm not sure what purpose the GUID's serve: I'd think that
having multiple projects of the same name would create a host of other
problems that the GUIDs wouldn't solve by themselves. Combine that with
the outright user hotility of string like this one, it's easy to wonder
why the GUIDs are used.

```
{4051A65D-4718-41AE-8C94-6B1906EB4D77} = {4051A65D-4718-41AE-8C94-6B1906EB4D77}
```

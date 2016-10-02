title: WMI and temperature probes...
date: 2006-01-27
filename: ./tech/win32/wmi_temperature_probes.txt

I've spent a little more time spelunking around Win32's support for
power and thermal management hardware. It seems like it should be
possible to use Windows API calls to determine the presence of
hardware temperature sensors and sample their current readings. As it
turns out, with <a
href="http://msdn.microsoft.com/library/default.asp?url=/library/en-us/wmisdk/wmi/wmi_reference.asp">Windows
Management Instrumentation (WMI)</a>, half of this is possible.

Quoting <a 
href="http://msdn.microsoft.com/library/en-us/wmisdk/wmi/about_wmi.asp?frame=true">MSDN</a>, 
<i>"Windows Management Instrumentation (WMI) is a component of the Windows operating system that 
provides management information and control in an enterprise environment. Administrators can use WMI 
to query and set information on desktop systems, applications, networks, and other enterprise 
components. Developers can use WMI to create event monitoring applications that alert users when 
important incidents occur."</i> Effectively, what that means is that there's a collection of COM 
objects that allow you to discover the hardware and software configuration of your local computer.  
With DCOM, it's possible to use this over the network to discover the same stuff on a remote 
machine. I'm guessing the intent is that the administrator of a server farm can use WMI services to 
aggregate statistics on her charges.

Reading the WMI documentation, one of the classes of information WMI makes available is <a 
href="http://msdn.microsoft.com/library/default.asp?url=/library/en-us/wmisdk/wmi/win32_temperatureprobe.asp">Win32_TemperatureProbe</a>, 
, which "represents the properties of a temperature sensor (electronic thermometer)." Had I read 
further, I would have also read the following and saved myself some time: "current implementations 
of WMI do not populate the CurrentReading property", but that's beside the point: this road gets 
more interesting before hitting that particular dead end. Doing some <a 
href="http://www.google.com">research</a> on WMI and scripting led to a nice <a 
href="http://www.4guysfromrolla.com/webtech/082802-1.shtml">tutorial on WMI</a> at the <a 
href="http://www.4guysfromrolla.com/">4 Guys From Rolla</a> website. From that, it was pretty easy 
to piece together this little piece of code that dumps data from arbitrary WMI classes:

```basic
wscript.echo "Temperature, version 0.1"

sub ShowServices(vClass)
  'Declare our needed variables...
  Dim objLocator, objService, objWEBMCol
  Dim objWEBM, objProp, propitem, objItem, str

  Set objLocator = _
     CreateObject("WbemScripting.SWbemLocator")
  Set objService = _
     objLocator.ConnectServer() ' Connect to local PC

  Set objWEBM = objService.get(vclass) 
  Set objWEBMCol = objWEBM.Instances_ 
  Set objProp = objWebm.properties_ 


  For Each propItem in objProp
    str = propItem.Name

    For Each objItem in objWEBMCol 
       str = str & ", " & Eval("objItem." & propItem.Name)
    Next

    wscript.echo str
  Next 
end sub

ShowServices "Win32_TemperatureProbe"
```

Dump that script into a .vbs file, run it with cscript, and it'll write out the
state of the objects of the specified class.  Since Windows doesn't report
temperature readings, Win32_TemperatureProbe isn't all hat useful, but you
ought to try it with something like Win32_Process or Win32_NetworkAdapter.

title: Windows.h is wierd...
date: 2006-01-23
nfilename: ./tech/win32/windows_h_is_wierd.txt

I've recently spent some time experimenting with the <a
href="http://msdn.microsoft.com/library/en-us/
power/base/callntpowerinformation.asp">CallNtPowerInformation</a>
Win32 API call. If you are not familiar with this call, it's a Windows
NT specific call that provides access to the power management related
features of the OS. Among other things, it allows the current CPU
frequency and battery charge to be retrieved. Like many other Win32
API's, `CallNtPowerInformation` has a very general prototype
(notice the two LPVOID's for input and output):

```c
NTSTATUS CallNtPowerInformation(
  POWER_INFORMATION_LEVEL InformationLevel,
  PVOID lpInputBuffer,
  ULONG nInputBufferSize,
  PVOID lpOutputBuffer,
  ULONG nOutputBufferSize
);
```

To use `CallNtPowerInformation`, the `InformationLevel` argument specifies one of a number of 
different possible function codes. Some of these update power management settings, some
retrieve current settings, and some retrieve system status values. Based on the function
code, you provide input and output arguments via standard structures passed in via
`lpInputBuffer` and `lpOutputBuffer`. 

Where things might start to get odd is when you try to use 
the `ProcessorInformation` information level. This information level requires an output
buffer of type <a href="http://msdn.microsoft.com/library/en-us/power/base/processor_power_information_str.asp?frame=true">
`PROCESSOR_POWER_INFORMATION`</a>. However, quoting from the MSDN documentation:
<i>"Note that <b>this structure definition was accidentally omitted from Winnt.h</b>. This error will be corrected
in the future. In the meantime, to compile your application, include the structure definition contained in
this topic in your source code."</i> Peachy.

Being the dilligant programmer I know you are, you will, of course, want to check your return
value when you call this function. Believe it or not, things are still wierd. To get the definition
of the `NTSTATUS` typedef, you need to include `winternl.h`. To get the complete
set of return codes, you need to include `ntstatus.h`. However, if you include
both `ntstatus.h` and `windows.h` you get warnings about duplicate 
preprocessor definitions. This is because some of these constants are defined in both
header files.  To solve this little problem, you need to define `WIN32_NO_STATUS`
before including `windows.h` and undefine it before including `ntstatus.h`.
This tells `windows.h` not to define return codes and reenables return code
definition for `ntstatus.h`.

The next problem you're likely to face is the fact that your program fails to link. This is
because the `powrprof.h` does not explicitly specify C function linkage. If you include
the header file unadorned in a C++ program, it'll assume C++ linkage, and try to call the 
API with a <a href="http://en.wikipedia.org/wiki/Name_mangling">mangled name</a>. This does not
work, so you're forced to explicltly specify C linkage for the include file. The net result of
all these complications might well end up looking like so:

```c
#define WIN32_NO_STATUS
#include <windows.h>
#undef WIN32_NO_STATUS

#include <ntstatus.h>
#include <winnt.h>

extern "C" {
   #include <powrprof.h>
}

#include <winternl.h>
```

I'm not honestly sure why this had to be quite this complicated...

using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Microsoft.Win32;

namespace NanoBanana.SystemOps
{
    public static class JdkHelper
    {
        public static bool IsValidJdkInstalled()
        {
            try
            {
                string javaHome = Environment.GetEnvironmentVariable("JAVA_HOME");
                if (!string.IsNullOrEmpty(javaHome) && CheckJavaVersion(Path.Combine(javaHome, "bin", "java.exe")))
                {
                    return true;
                }

                return CheckJavaRuntimeCommand();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error] JDK Detection failed: {ex.Message}");
                return false;
            }
        }

        private static bool CheckJavaRuntimeCommand()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "java",
                    Arguments = "-version",
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using (Process p = Process.Start(psi))
                {
                    string output = p.StandardError.ReadToEnd();
                    p.WaitForExit();
                    return ParseJavaVersion(output) >= 17;
                }
            }
            catch
            {
                return false;
            }
        }

        private static bool CheckJavaVersion(string javaExePath)
        {
            if (!File.Exists(javaExePath)) return false;
            return true;
        }

        private static int ParseJavaVersion(string versionOutput)
        {
            if (versionOutput.Contains("version \"17")) return 17;
            if (versionOutput.Contains("version \"21")) return 21;
            return 0;
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "Nano Banana Wrapper";
            
            if (!JdkHelper.IsValidJdkInstalled())
            {
                Console.WriteLine("CRITICAL: Java 17+ is required but not found.");
            }

            string appPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "resources", "app_core.exe");
            
            if (File.Exists(appPath))
            {
                Process.Start(appPath, string.Join(" ", args));
            }
            else
            {
                Console.WriteLine("Core application not found.");
            }
        }
    }
}

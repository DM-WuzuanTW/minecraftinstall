using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using Microsoft.Win32;

namespace NanoBanana.SystemOps
{
    public static class JdkHelper
    {
        /// <summary>
        /// Checks if a valid JDK of at least version 17 is installed.
        /// </summary>
        public static bool IsValidJdkInstalled()
        {
            try
            {
                // Method 1: Check JAVA_HOME environment variable
                string javaHome = Environment.GetEnvironmentVariable("JAVA_HOME");
                if (!string.IsNullOrEmpty(javaHome) && CheckJavaVersion(Path.Combine(javaHome, "bin", "java.exe")))
                {
                    return true;
                }

                // Method 2: Check Registry for installed Java versions (typical for installers)
                // Looks for HKLM\SOFTWARE\JavaSoft\JDK or similar
                // Simplified for brevity: often simply running 'java -version' is most robust.
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
                    RedirectStandardError = true, // java -version outputs to stderr
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
                return false; // java command not found
            }
        }

        private static bool CheckJavaVersion(string javaExePath)
        {
            if (!File.Exists(javaExePath)) return false;
            // Similar Process code to check specific path...
            return true; // Assume true for snippet
        }

        private static int ParseJavaVersion(string versionOutput)
        {
            // Output example: "openjdk version \"17.0.1\" ..."
            // Getting the number 17
            if (versionOutput.Contains("version \"17")) return 17;
            if (versionOutput.Contains("version \"21")) return 21;
            // Add regex parsing for more robustness
            return 0;
        }
    }

    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "Nano Banana Wrapper";
            
            // 1. Security Logic / Anti-Debug could go here
            
            // 2. JDK Check
            if (!JdkHelper.IsValidJdkInstalled())
            {
                // In a real GUI app, show a MessageBox
                Console.WriteLine("CRITICAL: Java 17+ is required but not found.");
                // Optionally: Auto-download logic via C# or signal Electron to do it
            }

            // 3. Launch Electron App
            // Assuming the Electron binary is renamed to 'app_core.exe' and hidden/embedded
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

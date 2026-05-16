Deploying a Node.js App to cPanel: Complete Instruction Set

Prerequisites Checklist
Before starting, confirm you have:

 cPanel hosting account (shared or reseller) on an Nginx-based plan -- the Setup Node.js tool is only available on Nginx shared server plans InMotion Hosting
 Node.js app with a valid package.json and defined startup file (e.g., app.js or server.js)
 node_modules/ excluded from your upload (dependencies install server-side)
 Environment variables documented and ready


Phase 1: Create the Node.js Application in cPanel
1.1 Access the Node.js Manager
Log in to cPanel and click on Setup Node.js App under the Software section, then click the CREATE APPLICATION button. STORMERHOST
1.2 Fill in Application Settings
Fill in the following fields:

Node.js version -- select from the available versions
Application mode -- choose Development or Production
Application root -- the file system path appended to /home/username/ (e.g., mynodeapp). Do not put the application root inside the domain document root.
Application URL -- the public-facing domain or subdomain
Application startup file -- the main JS file that starts your app (e.g., app.js, server.js, index.js) KB Hosting


Critical: Do not use public_html directly unless you specifically want your Node.js app to serve static files from there -- this is generally not recommended for security and separation of concerns. Codegive

1.3 Create and Verify
Click "Create" and wait for cPanel to initialise the Node.js environment. You should see a confirmation and a test page link. Click OPEN to verify you see the "It Works!" message before proceeding. ElitehostKB Hosting

Phase 2: Upload Application Files
2.1 Open File Manager
Right-click File Manager to open it in a new tab for easy access. Navigate to the Application Root Directory you specified (e.g., /node_app). Elitehost
2.2 Upload Files
Upload all necessary Node.js files, including app.js, package.json, and any additional required files, to this directory. Do NOT upload node_modules/ -- it will be installed on the server. Elitehost
Alternative upload methods:

FTP/SFTP via FileZilla (point to application root directory)
Git repository clone directly to the application directory, if your cPanel installation supports Git deployment Thecpaneladmin

2.3 Verify package.json Structure
If package.json is not present, create it via File Manager. Right-click the file in the right-hand column and click Edit. Enter the following minimum structure: Chemical Cloud
json{
  "name": "app",
  "version": "1.0.0",
  "description": "My App",
  "main": "app.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC"
}

Phase 3: Install Dependencies
3.1 Via cPanel GUI
Return to Setup Node.js App. Click Run NPM Install to install all dependencies listed in your package.json file. Elitehost
3.2 Via SSH (Faster, Preferred)
To install packages with NPM and perform other command line tasks, log in via SSH and enter the virtual environment for the application using the source command shown in the information box at the top of the application setup page. KB Hosting
The source command will look like:
bashsource /home/username/nodevenv/mynodeapp/18/bin/activate && cd /home/username/mynodeapp
Then run:
bashnpm install

Phase 4: Configure Environment Variables
4.1 In cPanel GUI
If your app requires environment variables, click Add Variable under Environment Variables. Input the Variable Name and Value for each required variable, then click Done and Save to apply the changes. Elitehost
4.2 Required Variables for Production
Set environment variables including:

NODE_ENV=production
PORT=3000
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret Thecpaneladmin

4.3 Update App Code for Port Binding
Your app must read port from the environment (cPanel controls the actual port via proxy):
javascriptconst port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

Phase 5: Start and Verify the Application
5.1 Start the App
Click Start Application using the Start Application button. Elitehost
5.2 Verify Status
A green status indicates the app is running. A red status means there is an issue that needs fixing. Thecpaneladmin
5.3 Test in Browser
Open a new tab and type the URL for the application (e.g., node-app.yourdomain.com). Confirm the app loads as expected. STORMERHOST

Note: Every update made to the app will not be shown until the application has been restarted. Always restart after code changes. STORMERHOST


Phase 6: Database Connectivity (If Applicable)
Direct local connections from Node.js apps on shared hosting can be tricky or restricted. The best practice is to connect to an external database such as MongoDB Atlas, PlanetScale, or cPanel's own database via its public IP/hostname if allowed. The key is to use environment variables for connection strings. Codegive

Ongoing Operations Reference
TaskHowRestart after code updateSetup Node.js App > click RestartView logsSSH into virtual environment, check app outputUpdate Node versionEdit application in Setup Node.js App, change version, reinstallAdd env variableEdit app > Environment Variables > Add Variable > SaveEnter virtual env (SSH)Copy "source" command from app info box, paste in Terminal

Known Gotchas

"Cannot GET /" -- usually a routing issue where app routes don't account for the subdirectory URL. When you define routes in your application code, you must include the application URL in the route. KB Hosting
Missing package.json -- after the application is created, an information box is displayed advising that package.json is required to continue. Don't skip this. Chemical Cloud
Plan compatibility -- Node.js Application in cPanel is available for customers using Shared Hosting or Reseller Hosting plans. Managed VPS Hosting customers require a CloudLinux License. Chemical Cloud


Sources: thecpaneladmin.com, chemicloud.com, elitehost.co.za, stormerhost.com, inmotionhosting.com, hosting.com knowledge base, codegive.com
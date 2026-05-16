**High-Level Deployment Architecture for cPanel**





Phase 1: Prerequisites \& Environment Verification

Before starting the deployment, verify that your local application is fully operational and your hosting environment meets the following baseline requirements:



Application Readiness: Ensure your Node.js application runs without errors locally. Take note of your main entry point file (e.g., app.js or index.js) and any environment variables required.



cPanel Feature Support: Your hosting account must support Node.js applications (Look for Setup Node.js App under the Software section).



Terminal Access: Ensure Terminal access is enabled in your cPanel dashboard for installing project dependencies cleanly.



Domain Configuration: Ensure the target domain or subdomain is already pointed to your cPanel account.



Phase 2: Create the Node.js Application in cPanel

Log into your cPanel account.



Navigate to the Software section and click on Setup Node.js App \[02:03].



Click the Create Application button \[02:22].



Configure the following application parameters \[02:31]:



Node.js version: Select the recommended version that matches or is closest to your local environment (e.g., 16.20.2).



Risk Note: If you encounter a 500 Internal Server Error immediately after creation, delete the application and rebuild it using a different Node.js version \[02:54].



Application mode: Set this to Production \[03:18].



Application root: Enter the directory path where your application files will live (e.g., your subdomain folder name) \[03:29].



Application URL: Select the specific domain or subdomain from the dropdown to route traffic to the app \[03:40].



Application startup file: Specify your main entry point file. The cPanel default is app.js. If your entry file is named differently (like index.js), explicitly type it here \[03:50].



Click Create \[04:15]. Once successfully created, a virtual environment path will be generated at the top of the interface \[09:10].



Phase 3: Package and Upload Application Files

Prepare Local Files:



Open your project directory on your local machine.



Do not include the node\_modules folder. Uploading raw node\_modules can cause path conflicts and transfer overhead; dependencies should be compiled fresh on the server \[08:07].



Compress your remaining project files (including package.json, source code, and views) into a single .zip archive \[06:11].



Upload to File Manager:



Return to cPanel and open the File Manager \[05:25].



Navigate to the Application root folder you specified during Phase 2 \[05:34].



Click Upload in the top menu, select your .zip archive, and wait for the upload indicator to turn green \[06:28].



Extract and Organize:



Right-click the uploaded .zip file in the File Manager and select Extract \[07:04].



Critical Check: If your extraction creates a nested subdirectory folder, open that folder, select all contents, click Move, and shift them directly into the application root directory \[07:19].



Phase 4: Install Project Dependencies

While cPanel provides a graphical "Run npm install" button once it detects a valid package.json file \[08:47], utilizing the command line terminal is faster and more reliable \[09:02].



Go back to the Setup Node.js App page and copy the text next to the virtual environment indicator command at the top (it looks like source /home/.../nodevenv/.../bin/activate \&\& cd /home/...) \[09:10].



Return to the cPanel main dashboard and open the Terminal tool \[09:02].



Paste the copied virtual environment command into the terminal and press Enter \[09:19]. This activates the isolated Node.js environment and automatically drops you into your project's root directory.



Execute the installation command \[09:27]:



Bash

npm install

Wait for the terminal to complete downloading and building the dependencies listed in your package.json file \[09:39].



Phase 5: Configure Environment Variables \& Database (Optional)

If your application uses environment variables or a backend database (like MySQL), configure them securely within cPanel:



Reveal Hidden Files: In the File Manager, click Settings (top-right corner), check Show Hidden Files (dotfiles), and click Save \[10:24].



Edit .env File: Open and edit your .env file directly to update production values like port configurations or security keys \[10:31].



Database Configuration (MySQL Wizard):



If connecting to a database, navigate to cPanel's MySQL Database Wizard \[10:49].



Step 1: Create a new database name \[10:57].



Step 2: Create a database user and generate a secure password \[11:09].



Step 3: Check All Privileges to bind the user to the database and click Make Changes \[11:40].



Step 4: Update your .env or database configuration file with these new database credentials \[12:02].



Phase 6: Launch and Test the Application

Return to the Setup Node.js App dashboard.



Click the Restart button to flush the cache and reload your application with the newly compiled dependencies and environment settings \[12:18].



Open a new browser tab and navigate to your configured Application URL to verify that your Node.js web application is successfully served live online \[12:02].



The video can be viewed directly for visual reference here: https://www.youtube.com/watch?v=yak22tkm9Rs.


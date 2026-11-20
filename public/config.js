/* Runtime settings: read before the app starts, so ONE build can serve every client and every environment.
   Edit this file on the server (no rebuild). Leave a value empty to use the one the app was built with (VITE_*).

   apiUrl      the member API root, e.g. https://api.example.com/api. Empty = the stand-alone prototype (sample data).
   tenantHost  which client this site is for; empty = the address the page is opened from (the client's own domain).
   demoHosts   addresses that stay the PROTOTYPE even when apiUrl is set: the template's own preview address(es).
               Exact hosts or *.sub-domain patterns, e.g. ['my-template.onrender.com', '*.onrender.com', 'localhost'].
               Every other address (a client's domain) opens LIVE.

   One service for preview and clients (e.g. Render, with the clients' domains added to it):
     apiUrl: 'https://api.example.com/api', demoHosts: ['my-template.onrender.com']
   Preview on its own site (no apiUrl), clients on another site (apiUrl set, demoHosts empty): the two sites keep different copies of this file. */
window.__APP_CONFIG__ = { apiUrl: '', tenantHost: '', demoHosts: [] }

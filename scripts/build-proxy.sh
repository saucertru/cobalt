set -e
npm install @mercuryworkshop/scramjet@2.0.0-alpha @mercuryworkshop/bare-mux @mercuryworkshop/libcurl-transport --no-save
mkdir -p dist/scram dist/baremux dist/libcurl
cp proxy.html sw.js dist/
cp -r node_modules/@mercuryworkshop/scramjet/dist/* dist/scram/
cp -r node_modules/@mercuryworkshop/bare-mux/dist/* dist/baremux/
cp -r node_modules/@mercuryworkshop/libcurl-transport/dist/* dist/libcurl/

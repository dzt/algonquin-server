var ical = require('ical'),
  months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

ical.fromURL('https://www.nsboro.k12.ma.us/site/handlers/icalfeed.ashx?MIID=10', {}, function(err, data) {
  var items = [];
  for (var key in data) {
    items.push(data[key]);
  }
  console.log(items);
});

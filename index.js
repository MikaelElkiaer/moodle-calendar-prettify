let app = require('express')();
var request = require('sync-request');
let ical = require('ical.js');

app.get('/', (req, res) => {
    let userid = req.query.userid;
    let authtoken = req.query.authtoken;

    if (!/[0-9]{5}/.test(userid) || !/[0-9a-z]{30,50}/.test(authtoken))
    {
        res.statusCode = 403;
        res.send();
        return;
    }

    let ical = parseCalendar(userid, authtoken);

    res.header('content-type', 'text/calendar; charset=utf-8');
    res.header('content-disposition', 'attachment; filename=icalexport.ics');
    res.send(ical);
});

app.listen(process.env.PORT || 5000);

function parseCalendar(userid, authtoken) {
    var res = request('GET', `https://www.moodle.aau.dk/calendar/export_execute.php?userid=${userid}&authtoken=${authtoken}&preset_what=all&preset_time=recentupcoming`);
    var cal = res.getBody().toString();

    let jcal = ical.parse(cal);
    let comp = new ical.Component(jcal);
    let events = comp.getAllSubcomponents('vevent');

    events.forEach((event, i) => {
        let _event = new ical.Event(event);
        _event.description = _event.summary;

        let summaryRegex = /^((?:(?:Course|Kursus): (.*?))?(?: - Note: (.*?))?(?: - Time: (.*?))?(?: - Place: (.*?))?(?: - Teacher: (.*))?)$/;
        let abrvRegex = /.*?(?:\(([^\s]*?)\)).*/;
        let match = _event.summary.match(summaryRegex);

        if (match) {
            if (match[2]) {
                let abrv = match[2].match(abrvRegex);
                _event.summary = abrv ? abrv[1] : match[2];
            }
            if (match[5])
                _event.place = match[5];
        }
    });

    return comp.toString();
}
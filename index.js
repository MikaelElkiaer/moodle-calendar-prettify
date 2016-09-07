let app = require('express')();
let request = require('sync-request');
let ical = require('ical.js');

app.get('/', (req, res) => {
    try {
        let userid = req.query.userid;
        let authtoken = req.query.authtoken;
        if (!/[0-9]{1,100}/.test(userid) || !/[0-9a-z]{1,100}/.test(authtoken))
        {
            res.statusCode = 403;
            res.send();
            return;
        }

        let ical = parseCalendar(userid, authtoken);
        res.header('content-type', 'text/calendar; charset=utf-8');
        res.header('content-disposition', 'attachment; filename=icalexport.ics');
        res.send(ical);
        return;
    } catch (error) {
        res.statusCode = 500;
        res.send();
        return;
    }
});

app.listen(process.env.PORT || 5000);

function parseCalendar(userid, authtoken) {
    let url = `https://www.moodle.aau.dk/calendar/export_execute.php?userid=${userid}&authtoken=${authtoken}&preset_what=all&preset_time=recentupcoming`;
    let rawCal = request('GET', url).getBody().toString();
    let component = new ical.Component(ical.parse(rawCal));
    let events = component.getAllSubcomponents('vevent');

    events.forEach(event => {
        let _event = new ical.Event(event);
        _event.description = _event.summary;

        let match = _event.summary.match(/^((?:(?:Course|Kursus): (.*?))?(?: - Note: (.*?))?(?: - Time: (.*?))?(?: - Place: (.*?))?(?: - Teacher: (.*))?)$/);
        if (match) {
            if (match[2]) {
                let abrv = match[2].match(/.*?(?:\(([^\s]*?)\)).*/);
                _event.summary = abrv ? abrv[1] : match[2];
            }
            if (match[5])
                _event.location = match[5];
        }
    });

    return component.toString();
}
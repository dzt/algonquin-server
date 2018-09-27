const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;

const Entities = require('html-entities').XmlEntities;
const entities = new Entities();

const fs = require('fs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36';

app.get('/', function (req, res) {
    return res.status(200).send({
        error: false,
        message: "Algonquin App API v1"
    });
});

app.post('/api/courses', function (req, res) {

    const cheerio = require('cheerio');

    const j = require('request').jar();
    const request = require('request').defaults({
        timeout: 10000,
        jar: j
    });

    let userid = req.body.userid;
    let password = req.body.password;

    request({
        url: `https://ipassweb.harrisschool.solutions/school/nsboro/syslogin.html`,
        followAllRedirects: true,
        method: 'post',
        headers: {
            'User-Agent': userAgent,
            'Origin': 'https://ipassweb.harrisschool.solutions',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://ipassweb.harrisschool.solutions/school/nsboro/syslogin.html',
            'Accept-Language': 'en-US,en;q=0.8'
        },
        formData: {
            password: password,
            userid: userid
        }
    }, function (err, response, body) {
        if (err) {
            return res.status(400).send({
                error: true,
                message: "An Error has occured please try again."
            });
        } else {
            if (body.indexOf('Invalid') > -1) {
                return res.status(400).send({
                    error: true,
                    message: "Error Occured while trying to log you in, please check your credentials and try again."
                });
            }
            requestsForCourses();
        }
    });

    function requestsForCourses() {
        request({
            url: `https://ipassweb.harrisschool.solutions/school/nsboro/samgrades.html`,
            followAllRedirects: true,
            method: 'get',
            headers: {
                'User-Agent': userAgent,
                'Accept-Language': 'en-US,en;q=0.8'
            }
        }, function (err, response, body) {
            if (err) {
                console.log('err', err);
            } else {
                parseCourses(body);
            }
        });
    }

    function parseCourses(html) {

        let tbody = '<table border="1" cellspacing="1" cellpadding="2" bgcolor="#FFFFFF" align="center">' + html.toString().split('<table border="1" cellspacing="1" cellpadding="2" bgcolor="#FFFFFF" align="center">')[1].split('</table>')[0] + '</table>';

        let $ = cheerio.load(html);

        let stdID;
        try {
            stdID = removeWhitespace($('.blueHBoldMed').text()).split('ID: ')[1];
        } catch (e) {
            return res.status(400).send({
                error: true,
                message: "Error Occured while trying to fetch student information, please try agian."
            });
        }

        let photo = null
        let photoURL = $('#kidphoto').attr('src');
        console.log('photoURL: ' + photoURL);

        request({
            method: 'get',
            url: 'https://ipassweb.harrisschool.solutions/school/nsboro/' + photoURL,
            followAllRedirects: true,
            encoding: 'binary',
            headers: {
                'User-Agent': userAgent
            }
        }, function (error, response, body) {

            if (!error && response.statusCode == 200) {

                const encodedImage = new Buffer(body, 'binary').toString('base64')

                // photo = "data:" + response.headers["content-type"] + ";base64," + new Buffer(body, 'binary').toString('base64');
                photo = new Buffer(body, 'binary').toString('base64');

                let data = {
                    error: false,
                    id: stdID,
                    student: removeWhitespace($('.blueHBoldMed').text()).split('Student:')[1].split(`ID: ${stdID}`)[0].trim(),
                    grade: removeWhitespace($('.Datal').eq(1).text()).trim(),
                    counselor: removeWhitespace($('.Datal').eq(2).text()).trim(),
                    yog: removeWhitespace($('.Datal').eq(3).text()).trim(),
                    photo: photo,
                    gradesYear: $('#academicYear option').eq(0).text(),
                    courses: []
                };

                let fail = false;

                cheerio.load(tbody)('tr').each(function (i, element) {

                    let teacher;
                    try {
                        teacher = removeWhitespace(cheerio.load(tbody)(this).find('td').eq(1).html()).split('<br>')[1];
                    } catch (e) {
                        fail = true;
                    }

                    let course;

                    try {
                        course = {
                            id: removeWhitespace(cheerio.load(tbody)(this).find('td').eq(0).text()),
                            name: entities.decode(removeWhitespace(cheerio.load(tbody)(this).find('td').eq(1).html()).split('<br>')[0].split('\n')[0]),
                            credits: removeWhitespace(cheerio.load(tbody)(this).find('td').eq(2).text()),
                            comments: removeWhitespace(cheerio.load(tbody)(this).find('td').eq(3).text()),
                            teacher: teacher
                        };
                        if (course.id != 'Course') {
                            data.courses.push(course);
                        };
                    } catch (e) {
                        fail = true;
                    }

                });

                if (fail) {
                    if (data.id) {
                        return res.status(200).send(data);
                    } else {
                        return res.status(400).send({
                            error: true,
                            message: "Error Occured while trying to fetch student information, please try agian."
                        });
                    }
                } else {
                    return res.status(200).send(data);
                }
                
            } else {
                return res.status(400).send({
                    error: true,
                    message: "Error Occured while trying to fetch student information, please try agian."
                });
            }
        });

    }

});

app.post('/api/reports', function (req, res) {
    const fs = require('fs');
    const cheerio = require('cheerio');

    const j = require('request').jar();
    const request = require('request').defaults({
        timeout: 10000,
        jar: j
    });

    let userid = req.body.userid;
    let password = req.body.password;

    request({
        url: `https://ipassweb.harrisschool.solutions/school/nsboro/syslogin.html`,
        followAllRedirects: true,
        method: 'post',
        headers: {
            'User-Agent': userAgent,
            'Origin': 'https://ipassweb.harrisschool.solutions',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': 'https://ipassweb.harrisschool.solutions/school/nsboro/syslogin.html',
            'Accept-Language': 'en-US,en;q=0.8'
        },
        formData: {
            password: password,
            userid: userid
        }
    }, function (err, response, body) {
        if (err) {
            return res.status(400).send({
                error: true,
                message: "An Error has occured please try again."
            });
        } else {
            if (body.indexOf('Invalid') > -1) {
                return res.status(400).send({
                    error: true,
                    message: "Error Occured while trying to log you in, please check your credentials and try again."
                });
            }
            requestsForReports();
        }
    });

    function requestsForReports() {
        request({
            url: `https://ipassweb.harrisschool.solutions/school/nsboro/samprogressrpt.html`,
            followAllRedirects: true,
            method: 'get',
            headers: {
                'User-Agent': userAgent,
                'Accept-Language': 'en-US,en;q=0.8'
            }
        }, function (err, response, body) {
            if (err) {
                console.log('err', err);
            } else {
                getTerms(body);
            }
        });
    }

    function getTerms(html) {
        let $ = cheerio.load(html);
        let termIDs = [];
        let acourse = '';
        let termSelection = null;

        cheerio.load(html)('input[name="Term"]').each(function (i, element) {
            termIDs.push({
                id: cheerio.load('input[name="Term"]')(this).attr('value'),
                term: i + 1
            });
        });

        cheerio.load(html)('select[name="acourse"] option').each(function (i, element) {
            let courseName = cheerio.load('select[name="acourse"] option')(this).text();
            let acourseValue = cheerio.load('select[name="acourse"] option')(this).attr('value');
            console.log(entities.encode(courseName));
            if (courseName.indexOf(req.body.course) > -1) {
                console.log(`Found: ${courseName} (${acourseValue})`);
                acourse = acourseValue
            }
        });

        if (termIDs.length == 0) {
            return res.status(400).send({
                error: true,
                message: "Error Occured while trying to fetch term information."
            });
        }

        if (acourse == '') {
            return res.status(400).send({
                error: true,
                message: "Error Occured while trying to fetching course information."
            });
        }

        for (let i = 0; i < termIDs.length; i++) {
            let termNo = termIDs[i].term;
            if (parseInt(req.body.term) == termNo) {
                termSelection = termIDs[i].id
            }
        }

        if (termSelection == null) {
            return res.status(400).send({
                error: true,
                message: "Invalid Term Value."
            });
        }

        parseReports(termSelection, acourse);
    }

    function parseReports(term, acourse) {

        console.log({
            'subType': 'SelectSubmitTerm',
            'Term': term,
            'acourse': acourse
        });

        request({
            url: `https://ipassweb.harrisschool.solutions/school/nsboro/samprogressrpt.html`,
            followAllRedirects: true,
            method: 'post',
            headers: {
                'User-Agent': userAgent,
                'Origin': 'https://ipassweb.harrisschool.solutions',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://ipassweb.harrisschool.solutions/school/nsboro/samprogressrpt.html',
                'Accept-Language': 'en-US,en;q=0.8'
            },
            formData: {
                'subType': 'SelectSubmitTerm',
                'Term': term,
                'acourse': acourse
            }
        }, function (err, response, body) {
            if (err) {
                return res.status(400).send({
                    error: true,
                    message: "An Error has occured please try again."
                });
            } else {
                if (body.indexOf('Invalid') > -1) {
                    return res.status(400).send({
                        error: true,
                        message: "Error Occured while trying to log you in, please check your credentials and try again."
                    });
                }

                let $ = cheerio.load(body);
                let overallGrade = null;

                $('td[class="MsoLarge"] strong').each(function (i, element) {
                    let text = $(this).text().trim();
                    if (text.indexOf('Overall Grade') > -1) {
                        overallGrade = text
                    }
                });

                if (overallGrade == null) {
                    overallGrade = 'n/a';
                } else {
                    overallGrade = overallGrade.split(':')[1].trim()
                }

                let data = {
                    error: false,
                    overallGrade: overallGrade,
                    assignments: []
                };

                return res.status(200).send(data);
            }
        });
    }
});

function removeWhitespace(text) {
    return text.trim();
};

app.listen(port, () => {
    console.log('App us running on port ' + port);
});
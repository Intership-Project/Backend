
-- 1. Create Database

CREATE DATABASE feedback_system;

USE feedback_system;


-- 2. Admin Table

CREATE TABLE Admin (
    id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);



-- 3. Faculty Table

CREATE TABLE Faculty (
    faculty_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    facultyname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255),
    role_id INT,
    course_id INT,
     FOREIGN KEY (role_id) REFERENCES role(role_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id)

);



-- 4. Course Table


CREATE TABLE Course (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    coursename VARCHAR(100) NOT NULL
);




-- 5. Batch Table



CREATE TABLE Batch (
    batch_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    batchname VARCHAR(100) NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id)
);




-- 6. Role Table



CREATE TABLE Role (
    role_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    rolename VARCHAR(100) NOT NULL
);




-- 7. Subject Table



CREATE TABLE Subject (
    subject_id INT PRIMARY KEY AUTO_INCREMENT,
    subjectname VARCHAR(100) NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);




-- 8. Student Table



CREATE TABLE Student (
    student_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    studentname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    course_id INT NOT NULL,
     batch_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id),
    FOREIGN KEY (batch_id) REFERENCES batch(batch_id)
);




-- 9. FeedbackType Table



CREATE TABLE FeedbackType (
    feedbacktype_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    fbtypename VARCHAR(100) NOT NULL
);




-- 10. FeedbackModuleType Table



CREATE TABLE FeedbackModuleType (
    feedbackmoduletype_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    fbmoduletypename VARCHAR(100) NOT NULL,
    feedbacktype_id INT NOT NULL,
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);




-- 11. FeedbackQuestions Table



CREATE TABLE FeedbackQuestions (
    feedbackquestion_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    questiontext TEXT NOT NULL,
    feedbacktype_id INT NOT NULL,
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);




-- 12. ScheduleFeedback Table



CREATE TABLE ScheduleFeedback (
    schedulefeedback_id INT PRIMARY KEY AUTO_INCREMENT NOT NULL,
    course_id INT NOT NULL,
    subject_id INT NOT NULL,
    faculty_id INT NOT NULL,
    batch_id INT NOT NULL,
    feedbacktype_id INT NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    feedbackmoduletype_id INT,
    FOREIGN KEY (course_id) REFERENCES course(course_id),
    FOREIGN KEY (subject_id) REFERENCES subject(subject_id),
    FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id),
    FOREIGN KEY (batch_id) REFERENCES batch(batch_id),
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id),
    FOREIGN KEY (feedbackmoduletype_id) REFERENCES FeedbackModuleType(feedbackmoduletype_id)
);


-- 13. FilledFeedback Table


CREATE TABLE filledfeedback (
    filledfeedbacks_id INT NOT NULL AUTO_INCREMENT,
    student_id INT NOT NULL,
    schedulefeedback_id INT NOT NULL,
    comments TEXT NULL,
    rating INT NULL,
    PRIMARY KEY (filledfeedbacks_id),
    KEY student_id (student_id),
    KEY schedulefeedback_id (schedulefeedback_id)
);


-- 14. FeedbackResponses Table


CREATE TABLE feedbackresponses (
    filledfeedbacks_id INT NOT NULL,
    feedbackquestion_id INT NOT NULL,
    response_rating VARCHAR(20) NOT NULL,
    PRIMARY KEY (filledfeedbacks_id, feedbackquestion_id)
);


-- 15. AddFeedback Table


CREATE TABLE addfeedback (
    addfeedback_id INT NOT NULL AUTO_INCREMENT,
    course_id INT NOT NULL,
    batch_id INT NULL,
    subject_id INT NOT NULL,
    faculty_id INT NOT NULL,
    feedbackmoduletype_id INT NOT NULL,
    feedbacktype_id INT NOT NULL,
    date DATE NOT NULL,
    pdf_file VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (addfeedback_id)
);




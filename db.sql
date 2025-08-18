-- 1. Create Database

CREATE DATABASE feedback_system;

USE feedback_system;


-- 2. Admin Table

CREATE TABLE Admin (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(50) NOT NULL
);



-- 3. Faculty Table

CREATE TABLE Faculty (
    faculty_id INT PRIMARY KEY AUTO_INCREMENT,
    facultyname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL
);



-- 4. Course Table


CREATE TABLE Course (
    course_id INT PRIMARY KEY AUTO_INCREMENT,
    coursename VARCHAR(100) NOT NULL
);




-- 5. Batch Table



CREATE TABLE Batch (
    batch_id INT PRIMARY KEY AUTO_INCREMENT,
    batchname VARCHAR(100) NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);




-- 6. Role Table



CREATE TABLE Role (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    rolename VARCHAR(100) NOT NULL,
    faculty_id INT NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)  ON DELETE CASCADE
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
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    studentname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(50) NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);




-- 9. FeedbackType Table



CREATE TABLE FeedbackType (
    feedbacktype_id INT PRIMARY KEY AUTO_INCREMENT,
    fbtypename VARCHAR(100) NOT NULL
);




-- 10. FeedbackModuleType Table



CREATE TABLE FeedbackModuleType (
    feedbackmoduletype_id INT PRIMARY KEY AUTO_INCREMENT,
    fbmoduletypename VARCHAR(100) NOT NULL,
    feedbacktype_id INT NOT NULL,
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);




-- 11. FeedbackQuestions Table



CREATE TABLE FeedbackQuestions (
    feedbackquestion_id INT PRIMARY KEY AUTO_INCREMENT,
    questiontext TEXT NOT NULL,
    feedbacktype_id INT NOT NULL,
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);




-- 12. ScheduleFeedback Table



CREATE TABLE ScheduleFeedback (
    schedulefeedback_id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    subject_id INT NOT NULL,
    faculty_id INT NOT NULL,
    batch_id INT NOT NULL,
    feedbacktype_id INT NOT NULL,
    StartDate DATE NOT NULL,
    EndDate DATE NOT NULL,
    FOREIGN KEY (course_id) REFERENCES Course(course_id),
    FOREIGN KEY (subject_id) REFERENCES Subject(subject_id),
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id),
    FOREIGN KEY (batch_id) REFERENCES Batch(batch_id),
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);




-- 13. FilledFeedbacks Table


CREATE TABLE FilledFeedback (
    filledfeedbacks_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    schedulefeedback_id INT NOT NULL,
    comments TEXT,
    rating INT,
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (schedulefeedback_id) REFERENCES ScheduleFeedback(schedulefeedback_id)
);

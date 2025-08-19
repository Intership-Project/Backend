
-- 1. Create Database
CREATE DATABASE feedback_system;
USE feedback_system;

-- 1. Admin Table
CREATE TABLE Admin (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    password VARCHAR(222)
);

-- 2. Faculty Table
CREATE TABLE Faculty (
    faculty_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    facultyname VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(500)
);

-- 3. Course Table
CREATE TABLE Course (
    course_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    coursename VARCHAR(100)
);

-- 4. Batch Table
CREATE TABLE Batch (
    batch_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    batchname VARCHAR(100),
    course_id INT,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

-- 5. Role Table
CREATE TABLE Role (
    role_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rolename VARCHAR(100),
    faculty_id INT,
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
);

-- 6. Subject Table
CREATE TABLE Subject (
    subject_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    subjectname VARCHAR(100),
    course_id INT,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

-- 7. Student Table
CREATE TABLE Student (
    student_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    studentname VARCHAR(100),
    email VARCHAR(100),
    password VARCHAR(500),
    course_id INT,
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);

-- 8. FeedbackType Table
CREATE TABLE FeedbackType (
    feedbacktype_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fbtypename VARCHAR(100)
);

-- 9. FeedbackModuleType Table
CREATE TABLE FeedbackModuleType (
    feedbackmoduletype_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fbmoduletypename VARCHAR(100),
    feedbacktype_id INT,
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);

-- 10. FeedbackQuestions Table
CREATE TABLE FeedbackQuestions (
    feedbackquestion_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    questiontext TEXT,
    feedbacktype_id INT,
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);

-- 11. ScheduleFeedback Table
CREATE TABLE ScheduleFeedback (
    schedulefeedback_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    course_id INT,
    subject_id INT,
    faculty_id INT,
    batch_id INT,
    feedbacktype_id INT,
    StartDate DATE,
    EndDate DATE,
    FOREIGN KEY (course_id) REFERENCES Course(course_id),
    FOREIGN KEY (subject_id) REFERENCES Subject(subject_id),
    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id),
    FOREIGN KEY (batch_id) REFERENCES Batch(batch_id),
    FOREIGN KEY (feedbacktype_id) REFERENCES FeedbackType(feedbacktype_id)
);

-- 12. FilledFeedbacks Table
CREATE TABLE FilledFeedback (
    filledfeedbacks_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    student_id INT,
    schedulefeedback_id INT,
    comments TEXT,
    rating INT,
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (schedulefeedback_id) REFERENCES ScheduleFeedback(schedulefeedback_id)
);




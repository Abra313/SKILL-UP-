update storage.buckets
set public = false,
    file_size_limit = 536870912,
    allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm', 'application/pdf']
where id = 'course-videos';

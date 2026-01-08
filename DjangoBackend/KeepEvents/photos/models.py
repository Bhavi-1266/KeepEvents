from django.db import models
from django.conf import settings
from events.models import Events   # adjust import to your project structure
from users.models import users

class Photo(models.Model):
    photoid = models.AutoField(primary_key=True)

    event = models.ForeignKey(
        Events,
        on_delete=models.CASCADE,
        related_name='photos'
    )

    uploadedBy = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_photos'
    )

    photoDesc = models.TextField(
        null=True,
        blank=True,
        max_length=500
    )

    photoFile = models.ImageField(
        upload_to='event_photos/'
    )

    uploadDate = models.DateTimeField(
        auto_now_add=True
    )

    # Tags extracted by AI/ML or user
    extractedTags = models.JSONField(
        null=True,
        blank=True
    )

    # Rich metadata (everything else)
    photoMeta = models.JSONField(
        null=True,
        blank=True,
        help_text="EXIF, width, height, ai_labels, colors, model, iso, shutter_speed, gps, etc."
    )

    likecount = models.PositiveIntegerField(
        default=0
    )
    viewcount = models.PositiveIntegerField(
        default=0
    )
    downloadcount = models.PositiveIntegerField(
        default=0
    )
    commentcount = models.PositiveIntegerField(
        default=0
    )

    isProcessed = models.BooleanField(
        default=False
    )
    Faces = models.JSONField(
        null=True,
        blank=True,
        help_text="List of user  detected in this photo  [{userid, username}]" 
    )

    FaceCount = models.PositiveIntegerField(
        default=0
    )


    def __str__(self):
        desc = self.photoDesc[:20] if self.photoDesc else ""
        return f"Photo {self.photoid}: {desc}"

    class Meta:
        ordering = ['-uploadDate']
        indexes = [
            models.Index(fields=['event']),
            models.Index(fields=['uploadDate']),
        ]


class likedPhoto(models.Model):
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='photo_likes'
    )
    likedAt = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = ('photo', 'user')
        ordering = ['-likedAt']

    def __str__(self):
        return f"likedPhoto: User {self.user.userid} liked Photo {self.photo.photoid} at {self.likedAt}"


class comment(models.Model):
    id = models.AutoField(primary_key=True)
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    commentText = models.TextField()

    commentedAt = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ['-commentedAt']

    def __str__(self):
        return f"Comment: User {self.user.userid} commented on Photo {self.photo.photoid} at {self.commentedAt}"

class downloadedPhoto(models.Model):
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='downloads'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='downloaded_photos'
    )
    downloadedAt = models.DateTimeField(
        auto_now_add=True
    )

    version = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="Version or resolution of the downloaded photo"
    )


    class Meta:
        ordering = ['-downloadedAt']
        unique_together = ('photo', 'user', 'version')

    def __str__(self):
        return f"DownloadedPhoto: User {self.user.userid} downloaded Photo {self.photo.photoid} at {self.downloadedAt}"
    
class viewedPhoto(models.Model):
    photo = models.ForeignKey(
        Photo,
        on_delete=models.CASCADE,
        related_name='views'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='viewed_photos'
    )
    viewedAt = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ['-viewedAt']
        unique_together = ('photo', 'user')

    def __str__(self):
        return f"ViewedPhoto: User {self.user.userid} viewed Photo {self.photo.photoid} at {self.viewedAt}" 
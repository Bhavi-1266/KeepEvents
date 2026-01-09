from django.contrib import admin
from django.utils.html import format_html
from .models import Photo , likedPhoto , comment , downloadedPhoto , viewedPhoto

@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = (
        'photoid',
        'small_thumb',
        'short_desc',
        'event',
        'uploadedBy',
        'uploadDate',
        'likecount',
        'viewcount',
        'downloadcount',
        'commentcount',
        "Faces" ,
        "FaceCount",
        "isProcessed",  
    )

    list_display_links = ('photoid', 'small_thumb', 'short_desc')

    search_fields = ('photoDesc', 'event__eventname', 'uploadedBy__username')

    list_filter = ('event', 'uploadedBy', 'uploadDate')

    readonly_fields = ('image_preview', 'photoid', 'uploadDate')

    ordering = ('-uploadDate', '-likecount', '-viewcount', '-downloadcount', '-commentcount')

    fieldsets = (
        (None, {
            'fields': ('photoDesc', 'photoFile', 'image_preview', 'uploadDate', 'photoid')
        }),
        ('Relations', {
            'fields': ('event', 'uploadedBy', 'likecount', 'viewcount', 'downloadcount', 'commentcount')
        }),
        ('Metadata', {
            'fields': ('extractedTags', 'photoMeta')
        }),
    )

    # ---------- small thumbnail in list ----------
    def small_thumb(self, obj):
        if obj.photoFile:
            return format_html('<img src="{}" style="height:50px;"/>', obj.photoFile.url)
        return ""
    small_thumb.short_description = "Preview"

    # ---------- description clip ----------
    def short_desc(self, obj):
        if obj.photoDesc:
            return obj.photoDesc[:30] + "..." if len(obj.photoDesc) > 30 else obj.photoDesc
        return ""
    short_desc.short_description = "Description"

    # ---------- large preview on detail page ----------
    def image_preview(self, obj):
        if obj.photoFile:
            return format_html('<img src="{}" style="max-height:350px;"/>', obj.photoFile.url)
        return "No image"
    image_preview.short_description = "Full Preview"


# Register the Photo model with the custom admin

@admin.register(likedPhoto)
class likedPhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'photo', 'user')
    list_filter = ('user',)
    search_fields = ('photo__photoDesc', 'user__username')
    ordering = ('-id',)


@admin.register(comment)
class commentAdmin(admin.ModelAdmin):   
    list_display = ('id', 'photo', 'user', 'short_comment', 'commentedAt')
    list_filter = ('user', 'commentedAt')
    search_fields = ('photo__photoDesc', 'user__username', 'commentText')
    ordering = ('-commentedAt',)

    def short_comment(self, obj):
        if obj.commentText:
            return obj.commentText[:30] + "..." if len(obj.commentText) > 30 else obj.commentText
        return ""
    short_comment.short_description = "Comment"


@admin.register(downloadedPhoto)
class downloadedPhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'photo', 'user', 'version', 'downloadedAt')
    list_filter = ('user', 'version', 'downloadedAt')
    search_fields = ('photo__photoDesc', 'user__username')
    ordering = ('-downloadedAt',)

@admin.register(viewedPhoto)
class viewedPhotoAdmin(admin.ModelAdmin):
    list_display = ('id', 'photo', 'user', 'viewedAt')
    list_filter = ('user', 'viewedAt')
    search_fields = ('photo__photoDesc', 'user__username')
    ordering = ('-viewedAt',)


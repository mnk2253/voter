
import React, { useState, useEffect } from 'react';
// Fix: Use @firebase/firestore to resolve missing exported member errors
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  orderBy, 
  query, 
  updateDoc, 
  doc, 
  arrayUnion, 
  arrayRemove
} from '@firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Post, UserProfile, Comment, CommentReply } from '../types';
import { Heart, MessageCircle, Send, Image as ImageIcon, X, Clock, MoreHorizontal, Edit2, Check, ShieldCheck, Megaphone, Eye, EyeOff, CornerDownRight, Trash2 } from 'lucide-react';

export const PostList: React.FC<{ currentUser: UserProfile, filterNotices?: boolean }> = ({ currentUser, filterNotices = false }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isNotice, setIsNotice] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});
  
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Post)));
    });
    return unsubscribe;
  }, []);

  const compressPostImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !image) return;

    setUploading(true);
    let imageUrl = '';

    try {
      if (image) {
        try {
          const imageRef = ref(storage, `posts/${Date.now()}_${image.name}`);
          const res = await uploadBytes(imageRef, image);
          imageUrl = await getDownloadURL(res.ref);
        } catch (err) {
          imageUrl = await compressPostImage(image);
        }
      }

      await addDoc(collection(db, 'posts'), {
        userId: currentUser.id,
        userName: currentUser.name,
        userPhoto: currentUser.photoUrl,
        userRole: currentUser.role,
        content: content.trim(),
        imageUrl,
        likes: [],
        comments: [],
        createdAt: Date.now(),
        status: 'active',
        isNotice: currentUser.role === 'admin' ? isNotice : false
      });

      setContent('');
      setImage(null);
      setPreview('');
      setIsNotice(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdatePost = async (postId: string) => {
    if (!editContent.trim()) return;
    setIsUpdating(true);
    try {
      const postRef = doc(db, 'posts', postId);
      await updateDoc(postRef, {
        content: editContent.trim()
      });
      setEditingPostId(null);
      setEditContent('');
    } catch (err) {
      console.error("Error updating post:", err);
      alert('পোস্ট আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (postId: string, currentStatus?: 'active' | 'deactive') => {
    const newStatus = currentStatus === 'deactive' ? 'active' : 'deactive';
    const message = newStatus === 'deactive' 
      ? 'আপনি কি নিশ্চিত যে এই পোস্টটি হাইড (Hidden) করতে চান?' 
      : 'আপনি কি নিশ্চিত যে এই পোস্টটি সবার জন্য উন্মুক্ত (Public) করতে চান?';
    
    if (window.confirm(message)) {
      try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          status: newStatus
        });
      } catch (err) {
        alert('স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
      }
    }
  };

  const handleLike = async (postId: string, currentLikes: string[] = []) => {
    const isLiked = currentLikes.includes(currentUser.id);
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      likes: isLiked ? arrayRemove(currentUser.id) : arrayUnion(currentUser.id)
    });
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    const postRef = doc(db, 'posts', postId);
    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      userName: currentUser.name,
      userPhoto: currentUser.photoUrl,
      text: text.trim(),
      createdAt: Date.now(),
      replies: []
    };

    try {
      await updateDoc(postRef, {
        comments: arrayUnion(newComment)
      });
      setCommentInputs({ ...commentInputs, [postId]: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReply = async (postId: string, commentId: string) => {
    const text = replyInputs[commentId];
    if (!text?.trim()) return;

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const updatedComments = post.comments.map(c => {
      if (c.id === commentId) {
        const newReply: CommentReply = {
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          userName: currentUser.name,
          userPhoto: currentUser.photoUrl,
          text: text.trim(),
          createdAt: Date.now()
        };
        return {
          ...c,
          replies: [...(c.replies || []), newReply]
        };
      }
      return c;
    });

    try {
      await updateDoc(doc(db, 'posts', postId), {
        comments: updatedComments
      });
      setReplyInputs({ ...replyInputs, [commentId]: '' });
      setActiveReplyId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (postId: string, comment: Comment) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই কমেন্টটি মুছে ফেলতে চান?')) {
      try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
          comments: arrayRemove(comment)
        });
      } catch (err) {
        console.error("Error deleting comment:", err);
      }
    }
  };

  const handleDeleteReply = async (postId: string, commentId: string, replyId: string) => {
    if (window.confirm('আপনি কি নিশ্চিত যে এই উত্তরটি মুছে ফেলতে চান?')) {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const updatedComments = post.comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: (c.replies || []).filter(r => r.id !== replyId)
          };
        }
        return c;
      });

      try {
        await updateDoc(doc(db, 'posts', postId), {
          comments: updatedComments
        });
      } catch (err) {
        console.error("Error deleting reply:", err);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'এইমাত্র';
    if (minutes < 60) return `${minutes} মিনিট আগে`;
    if (hours < 24) return `${hours} ঘণ্টা আগে`;
    if (days < 7) return `${days} দিন আগে`;
    return new Date(timestamp).toLocaleDateString('bn-BD');
  };

  const visiblePosts = posts.filter(post => {
    const isBasicVisible = post.status !== 'deactive' || post.userId === currentUser.id || currentUser.role === 'admin';
    if (!isBasicVisible) return false;
    if (post.isNotice) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Create Post Input */}
      <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
        <div className="flex space-x-4">
          <img src={currentUser.photoUrl} className="h-12 w-12 rounded-2xl object-cover border-2 border-green-50 shadow-sm" alt="" />
          <div className="flex-1">
            <textarea
              placeholder={`${currentUser.name}, আপনার মনে কি আছে শেয়ার করুন...`}
              className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-green-100 outline-none resize-none placeholder:text-gray-400"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            
            {preview && (
              <div className="mt-4 relative inline-block">
                <img src={preview} className="max-h-64 rounded-2xl shadow-lg border-2 border-white" alt="preview" />
                <button 
                  onClick={() => { setImage(null); setPreview(''); }} 
                  className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={16}/>
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 border-t border-gray-50 pt-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-gray-500 cursor-pointer hover:bg-green-50 px-4 py-2 rounded-xl transition-all">
                  <ImageIcon size={20} className="text-green-600" />
                  <span className="text-sm font-bold text-gray-600">ছবি/ভিডিও</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </label>
                
                {currentUser.role === 'admin' && (
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-all ${isNotice ? 'bg-amber-500' : 'bg-gray-300'}`} onClick={() => setIsNotice(!isNotice)}>
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${isNotice ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-500 uppercase">নোটিশ হিসেবে দিন</span>
                  </label>
                )}
              </div>
              
              <button
                disabled={uploading || (!content.trim() && !image)}
                onClick={handleSubmitPost}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <span>পোস্ট করুন</span>
                )}
              </button>
            </div>
            {isNotice && (
              <p className="mt-2 text-[10px] text-amber-600 font-bold flex items-center">
                <Megaphone size={12} className="mr-1" /> এটি শুধুমাত্র হোম পেজের স্ক্রলিং ব্যানারে দেখা যাবে।
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Post Feed */}
      <div className="space-y-6 pb-10">
        {visiblePosts.map(post => {
          const postLikes = post.likes || [];
          const postComments = post.comments || [];
          const isLikedByMe = postLikes.includes(currentUser.id);
          const isCommentsOpen = activeCommentPostId === post.id;
          const isOwner = post.userId === currentUser.id;
          const isAdmin = currentUser.role === 'admin';
          const isEditing = editingPostId === post.id;
          const isDeactive = post.status === 'deactive';
          
          return (
            <div key={post.id} className={`bg-white rounded-3xl shadow-sm border overflow-hidden transition-all hover:shadow-md border-gray-100 ${isDeactive ? 'bg-amber-50/40 border-dashed border-amber-200 opacity-90' : ''}`}>
              {isDeactive && (
                <div className="bg-amber-100/80 text-amber-700 px-4 py-2 text-[11px] font-bold uppercase tracking-tight flex items-center border-b border-amber-200/50">
                  <EyeOff size={14} className="mr-2" /> 
                  এই পোস্টটি বর্তমানে লুকানো (Hidden) আছে
                </div>
              )}
              
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img src={post.userPhoto} className="h-11 w-11 rounded-2xl object-cover border border-gray-50 shadow-sm" alt="" />
                  <div>
                    <div className="flex items-center space-x-1">
                      <h3 className="font-bold text-gray-800 leading-tight">{post.userName}</h3>
                      {post.userRole === 'admin' && <ShieldCheck size={14} className="text-green-600" />}
                    </div>
                    <div className="flex items-center text-[10px] text-gray-400 font-medium">
                      <Clock size={10} className="mr-1" />
                      <span>{formatTime(post.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {(isOwner || isAdmin) && !isEditing && (
                    <>
                      <button 
                        onClick={() => handleToggleStatus(post.id, post.status)}
                        className={`p-2 transition-all rounded-full ${isDeactive ? 'text-green-600 bg-green-50 shadow-sm hover:bg-green-100' : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'}`}
                        title={isDeactive ? 'পাবলিক করুন' : 'হাইড করুন'}
                      >
                        {isDeactive ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      {isOwner && (
                        <button 
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditContent(post.content);
                          }}
                          className="text-gray-300 hover:text-green-600 p-2 transition-colors rounded-full hover:bg-green-50"
                        >
                          <Edit2 size={18} />
                        </button>
                      )}
                    </>
                  )}
                  <button className="text-gray-400 hover:text-gray-600 p-2">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-5 pb-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      className="w-full bg-gray-50 border border-green-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-green-100 outline-none resize-none"
                      rows={3}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUpdatePost(post.id)}
                        disabled={isUpdating}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        {isUpdating ? '...' : 'সেভ করুন'}
                      </button>
                      <button onClick={() => setEditingPostId(null)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-xs font-bold">বাতিল</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap text-[15px] font-medium leading-relaxed">{post.content}</p>
                )}
              </div>

              {/* Post Image */}
              {post.imageUrl && !isEditing && (
                <div className={`px-5 pb-5 ${isDeactive ? 'opacity-50 grayscale-[0.2]' : ''}`}>
                  <img 
                    src={post.imageUrl} 
                    className="w-full h-auto max-h-[550px] object-cover rounded-2xl shadow-sm cursor-pointer" 
                    alt="post" 
                    onClick={() => window.open(post.imageUrl, '_blank')}
                  />
                </div>
              )}

              {/* Engagement Stats */}
              {!isDeactive && (
                <div className="px-5 py-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-50/50">
                  <div className="flex items-center space-x-1">
                    <Heart size={10} className="text-pink-600" fill="currentColor" />
                    <span className="font-bold">{postLikes.length} জন</span>
                  </div>
                  <div className="hover:underline cursor-pointer" onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}>
                    {postComments.length} টি কমেন্ট
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isDeactive && (
                <div className="px-2 py-1 flex items-center border-t border-gray-50">
                  <button 
                    onClick={() => handleLike(post.id, postLikes)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-all active:scale-95 ${isLikedByMe ? 'text-pink-600 bg-pink-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Heart size={20} fill={isLikedByMe ? 'currentColor' : 'none'} />
                    <span className="font-bold text-sm">লাইক</span>
                  </button>
                  <button 
                    onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-xl transition-all ${isCommentsOpen ? 'text-green-600 bg-green-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    <MessageCircle size={20} />
                    <span className="font-bold text-sm">কমেন্ট</span>
                  </button>
                </div>
              )}

              {/* Comments Section */}
              {isCommentsOpen && !isDeactive && (
                <div className="bg-gray-50/60 border-t border-gray-100 p-4 space-y-4">
                  {postComments.map((comment) => (
                    <div key={comment.id} className="space-y-3">
                      <div className="flex space-x-3 group">
                        <img src={comment.userPhoto || ''} className="h-8 w-8 rounded-xl object-cover border border-gray-100" alt="" />
                        <div className="flex-1">
                          <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm relative">
                            <p className="font-bold text-xs text-gray-800 flex items-center">
                              {comment.userName}
                              {comment.userId === post.userId && <span className="ml-2 bg-blue-50 text-blue-600 text-[8px] px-1 rounded-sm border border-blue-100">লেখক</span>}
                            </p>
                            <p className="text-gray-600 text-[13px] leading-snug mt-0.5">{comment.text}</p>
                            
                            {/* Comment Actions */}
                            <div className="mt-2 flex items-center space-x-3 text-[10px] font-bold text-gray-400">
                              <span>{formatTime(comment.createdAt)}</span>
                              <button 
                                onClick={() => setActiveReplyId(activeReplyId === comment.id ? null : comment.id)}
                                className="text-green-600 hover:underline flex items-center"
                              >
                                <CornerDownRight size={10} className="mr-0.5" /> উত্তর দিন
                              </button>
                              {(comment.userId === currentUser.id || currentUser.role === 'admin') && (
                                <button 
                                  onClick={() => handleDeleteComment(post.id, comment)}
                                  className="text-red-400 hover:text-red-600"
                                >
                                  মুছুন
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Replies Display */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-4 space-y-3 border-l-2 border-green-100 pl-4">
                              {comment.replies.map(reply => (
                                <div key={reply.id} className="flex space-x-3">
                                  <img src={reply.userPhoto || ''} className="h-6 w-6 rounded-lg object-cover border border-gray-100" alt="" />
                                  <div className="flex-1 bg-white/60 px-3 py-1.5 rounded-2xl rounded-tl-none border border-green-50 shadow-sm">
                                    <p className="font-bold text-[10px] text-gray-800 flex items-center">
                                      {reply.userName}
                                      {reply.userId === post.userId && <span className="ml-1.5 bg-blue-50 text-blue-600 text-[7px] px-1 rounded-sm">লেখক</span>}
                                    </p>
                                    <p className="text-gray-600 text-[12px] leading-snug">{reply.text}</p>
                                    <div className="mt-1 flex items-center space-x-3 text-[9px] font-bold text-gray-400">
                                      <span>{formatTime(reply.createdAt)}</span>
                                      {(reply.userId === currentUser.id || currentUser.role === 'admin') && (
                                        <button 
                                          onClick={() => handleDeleteReply(post.id, comment.id, reply.id)}
                                          className="text-red-300 hover:text-red-500"
                                        >
                                          মুছুন
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Reply Input Form */}
                          {activeReplyId === comment.id && (
                            <div className="mt-3 ml-4 flex items-center space-x-2 animate-in slide-in-from-left-2 duration-200">
                              <div className="flex-1 relative">
                                <input 
                                  autoFocus
                                  type="text"
                                  placeholder={`${comment.userName}-কে উত্তর লিখুন...`}
                                  className="w-full bg-white border border-green-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-green-100"
                                  value={replyInputs[comment.id] || ''}
                                  onChange={(e) => setReplyInputs({ ...replyInputs, [comment.id]: e.target.value })}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddReply(post.id, comment.id)}
                                />
                              </div>
                              <button 
                                onClick={() => handleAddReply(post.id, comment.id)}
                                disabled={!replyInputs[comment.id]?.trim()}
                                className="bg-green-600 text-white p-2 rounded-xl shadow-sm hover:bg-green-700 disabled:bg-gray-200 transition-all"
                              >
                                <Send size={14} fill="currentColor" />
                              </button>
                              <button onClick={() => setActiveReplyId(null)} className="text-gray-400 p-1 hover:text-red-500">
                                <X size={16} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Root Comment Input */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 mt-4">
                    <img src={currentUser.photoUrl} className="h-8 w-8 rounded-xl object-cover" alt="" />
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        placeholder="একটি কমেন্ট লিখুন..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-100"
                        value={commentInputs[post.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      />
                    </div>
                    <button 
                      onClick={() => handleAddComment(post.id)} 
                      disabled={!commentInputs[post.id]?.trim()}
                      className="bg-green-600 text-white p-2.5 rounded-xl shadow-md hover:bg-green-700 disabled:bg-gray-200 transition-all"
                    >
                      <Send size={18} fill="currentColor" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {visiblePosts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
            <p className="text-gray-400">কোন সাধারণ পোস্ট খুঁজে পাওয়া যায়নি।</p>
          </div>
        )}
      </div>
    </div>
  );
};

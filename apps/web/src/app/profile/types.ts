export interface FriendshipRow {
  user_a: string;
  user_b: string;
  status: "pending" | "accepted" | "blocked";
  requested_by: string;
  created_at: string;
}

export interface ProfileLite {
  id: string;
  username: string;
  avatar_url: string | null;
}
